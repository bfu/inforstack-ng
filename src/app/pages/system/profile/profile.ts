import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzUploadFile, NzUploadModule, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { UserApi } from '@api/system/user';
import { SysUser } from '@core/models/system';
import { passwordValidator } from '@core/utils/password-rule';
import { RuoYiReuseStrategy } from '@core/reuse-strategy';
import { TagsViewStore } from '@store/tags-view.store';
import { UserStore } from '@store/user.store';

/** 头像大小上限(MB) */
const AVATAR_MAX_SIZE = 5;

/** 手机号规则，与后端 / 用户管理保持一致 */
const PHONE_PATTERN = /^1[3|4|5|6|7|8|9][0-9]\d{8}$/;

function markAllDirty(form: FormGroup): void {
  Object.values(form.controls).forEach((control) => {
    control.markAsDirty();
    control.updateValueAndValidity();
  });
}

/**
 * 个人中心
 * 对应 ruoyi-vue3/src/views/system/user/profile/index.vue（userInfo / resetPwd / userAvatar）
 *
 * 头像不做裁剪（上游依赖 vue-cropper，Angular 无对应依赖），选中后直接上传
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-profile-page',
  imports: [
    ReactiveFormsModule,
    NzAvatarModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzRadioModule,
    NzTabsModule,
    NzUploadModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.less',
})
export class ProfilePage implements OnInit {
  private readonly api = inject(UserApi);
  private readonly fb = inject(FormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tags = inject(TagsViewStore);
  private readonly reuse = inject(RuoYiReuseStrategy);

  readonly store = inject(UserStore);

  readonly user = signal<SysUser>({});
  readonly roleGroup = signal('');
  readonly postGroup = signal('');
  /** 0 基本资料，1 修改密码 */
  readonly activeTab = signal(0);
  readonly savingInfo = signal(false);
  readonly savingPwd = signal(false);

  readonly initial = computed(() =>
    (this.store.nickName() || this.store.name() || 'U').slice(0, 1),
  );

  readonly infoForm = this.fb.nonNullable.group({
    nickName: ['', [Validators.required, Validators.maxLength(30)]],
    phonenumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
    sex: [''],
  });

  readonly pwdForm = this.fb.nonNullable.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, passwordValidator('新密码')]],
    confirmPassword: ['', [Validators.required]],
  });

  /** 新密码校验提示：错误值本身即文案，空值时退化为必填提示 */
  get newPasswordError(): string {
    const errors = this.pwdForm.controls.newPassword.errors;
    if (!errors) {
      return '';
    }
    return (errors['password'] as string | undefined) ?? '新密码不能为空';
  }

  ngOnInit(): void {
    // 支持 /user/profile/resetPwd 直达「修改密码」页签
    if (this.route.snapshot.paramMap.get('activeTab') === 'resetPwd') {
      this.activeTab.set(1);
    }
    this.getProfile();
  }

  getProfile(): void {
    this.api.getUserProfile().subscribe({
      next: (res) => {
        const user = res.data ?? {};
        this.user.set(user);
        this.roleGroup.set(res.roleGroup ?? '');
        this.postGroup.set(res.postGroup ?? '');
        this.infoForm.patchValue({
          nickName: user.nickName ?? '',
          phonenumber: user.phonenumber ?? '',
          email: user.email ?? '',
          sex: user.sex ?? '',
        });
      },
    });
  }

  /** 保存基本资料 */
  submitInfo(): void {
    if (this.infoForm.invalid) {
      markAllDirty(this.infoForm);
      return;
    }
    const value = this.infoForm.getRawValue();
    this.savingInfo.set(true);
    this.api.updateUserProfile(value as SysUser).subscribe({
      next: () => {
        this.savingInfo.set(false);
        this.message.success('修改成功');
        this.user.update((user) => ({ ...user, ...value }));
        // 同步本地用户态，顶栏昵称立即生效
        this.store.updateLocalUser({ nickName: value.nickName });
      },
      error: () => this.savingInfo.set(false),
    });
  }

  /** 保存新密码 */
  submitPwd(): void {
    if (this.pwdForm.invalid) {
      markAllDirty(this.pwdForm);
      return;
    }
    const { oldPassword, newPassword, confirmPassword } = this.pwdForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.message.warning('两次输入的密码不一致');
      return;
    }
    this.savingPwd.set(true);
    this.api.updateUserPwd(oldPassword, newPassword).subscribe({
      next: () => {
        this.savingPwd.set(false);
        this.message.success('修改成功');
        this.pwdForm.reset({ oldPassword: '', newPassword: '', confirmPassword: '' });
      },
      error: () => this.savingPwd.set(false),
    });
  }

  /** 头像选择前校验：类型与大小 */
  beforeAvatarUpload = (file: NzUploadFile): boolean => {
    if (!file.type?.startsWith('image/')) {
      this.message.error('文件格式错误，请上传图片类型，如：JPG，PNG 后缀的文件');
      return false;
    }
    if ((file.size ?? 0) > AVATAR_MAX_SIZE * 1024 * 1024) {
      this.message.error(`头像大小不能超过 ${AVATAR_MAX_SIZE}MB`);
      return false;
    }
    return true;
  };

  /**
   * 覆盖默认上传行为，直连后端头像接口
   * （该接口会同步更新 sys_user.avatar 并删除旧头像文件，不能用通用上传接口替代）
   */
  customAvatarRequest = (item: NzUploadXHRArgs) => {
    return this.api.uploadAvatar(item.file as unknown as File).subscribe({
      next: (res) => {
        const imgUrl = res.imgUrl ?? '';
        item.onSuccess?.(res, item.file, undefined);
        this.user.update((user) => ({ ...user, avatar: imgUrl }));
        this.store.updateLocalUser({ avatar: imgUrl });
        this.message.success('修改成功');
      },
      error: () => {
        item.onError?.(new Error('上传失败'), item.file);
      },
    });
  };

  /** 关闭当前页签并回到上一个页签（对应 ruoyi-vue3 的 $tab.closePage） */
  close(): void {
    const path = this.router.url.split('?')[0];
    this.tags.delView({ path, title: '个人中心', closable: true });
    this.reuse.clear(path);
    const last = this.tags.visitedViews().slice(-1)[0];
    void this.router.navigateByUrl(last?.path ?? '/index');
  }
}
