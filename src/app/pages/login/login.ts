import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { LoginApi } from '../../api/login';
import { UserStore } from '../../store/user.store';
import { environment } from '../../../environments/environment';
import { cache } from '../../core/utils/cache';

const REMEMBER_KEY = 'login-username';

/**
 * 登录页
 * 对应 ruoyi-vue3/src/views/login.vue
 * 说明：零依赖方案下不使用 jsencrypt，「记住我」仅缓存账号，不保存密码
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, NzFormModule, NzInputModule, NzButtonModule, NzCheckboxModule],
  templateUrl: './login.html',
  styleUrl: './login.less',
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LoginApi);
  private readonly store = inject(UserStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly message = inject(NzMessageService);

  readonly title = environment.title;
  readonly footerContent = environment.footerContent;
  readonly registerEnabled = environment.registerEnabled;

  readonly form = this.fb.nonNullable.group({
    username: ['admin', [Validators.required]],
    password: ['admin123', [Validators.required]],
    code: [''],
    uuid: [''],
    rememberMe: [false],
  });

  readonly codeUrl = signal('');
  readonly captchaEnabled = signal(true);
  readonly loading = signal(false);

  private redirect = '';

  ngOnInit(): void {
    this.redirect = (this.route.snapshot.queryParams['redirect'] as string) ?? '';
    const remembered = cache.local.get(REMEMBER_KEY);
    if (remembered) {
      this.form.patchValue({ username: remembered, rememberMe: true });
    }
    this.getCode();
  }

  getCode(): void {
    this.api.getCodeImg().subscribe({
      next: (res) => {
        const enabled = res.captchaEnabled === undefined ? true : res.captchaEnabled;
        this.captchaEnabled.set(enabled);
        if (enabled) {
          this.codeUrl.set(`data:image/gif;base64,${res.img ?? ''}`);
          this.form.patchValue({ uuid: res.uuid ?? '', code: '' });
          this.form.controls.code.setValidators([Validators.required]);
        } else {
          this.form.controls.code.clearValidators();
        }
        this.form.controls.code.updateValueAndValidity();
      },
    });
  }

  submit(): void {
    // 防止回车与按钮点击重复提交
    if (this.loading()) {
      return;
    }
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }
    this.loading.set(true);
    const value = this.form.getRawValue();
    if (value.rememberMe) {
      cache.local.set(REMEMBER_KEY, value.username);
    } else {
      cache.local.remove(REMEMBER_KEY);
    }

    this.store
      .login({
        username: value.username.trim(),
        password: value.password,
        code: value.code,
        uuid: value.uuid,
      })
      .subscribe({
        next: () => {
          const query = { ...this.route.snapshot.queryParams };
          delete query['redirect'];
          void this.router.navigate([this.redirect || '/index'], { queryParams: query });
        },
        error: () => {
          this.loading.set(false);
          if (this.captchaEnabled()) {
            this.getCode();
          }
        },
      });
  }
}
