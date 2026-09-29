import {
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzUploadModule, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { NzFormatEmitEvent, NzTreeModule, NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { NzTreeSelectModule } from 'ng-zorro-antd/tree-select';
import { UserApi } from '@api/system/user';
import { DownloadService } from '@core/download.service';
import { PageQuery } from '@core/models/result';
import { SysPost, SysRole, SysUser } from '@core/models/system';
import { addDateRange, parseTime } from '@core/utils/ruoyi';
import { DictStore } from '@store/dict.store';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import { toTreeNodes } from '@shared/utils/tree.util';
import { TableSelection } from '@shared/utils/table-selection';
import { environment } from '@env/environment';

/** 用户管理，对应 ruoyi-vue3/src/views/system/user/index.vue */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-user-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    HasPermiDirective,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzDatePickerModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzRadioModule,
    NzSelectModule,
    NzSwitchModule,
    NzTableModule,
    NzTooltipModule,
    NzTreeModule,
    NzTreeSelectModule,
    NzUploadModule,
  ],
  templateUrl: './user.html',
  styleUrl: './user.less',
})
export class UserPage implements OnInit {
  private readonly api = inject(UserApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly download = inject(DownloadService);
  private readonly dictStore = inject(DictStore);
  private readonly router = inject(Router);

  readonly searchForm = this.fb.nonNullable.group({
    userName: [''],
    phonenumber: [''],
    status: [''],
  });

  readonly dateRange = signal<Date[]>([]);

  readonly rows = signal<SysUser[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageNum = signal(1);
  readonly pageSize = signal(environment.pageSize);

  readonly deptNodes = signal<NzTreeNodeOptions[]>([]);
  readonly deptOptions = signal<NzTreeNodeOptions[]>([]);
  readonly deptId = signal<number | undefined>(undefined);

  /** 表格多选状态 */
  readonly selection = new TableSelection<SysUser, number>((row) => row.userId);

  readonly dialogVisible = signal(false);
  readonly dialogTitle = signal('');
  readonly submitting = signal(false);
  readonly posts = signal<SysPost[]>([]);
  readonly roles = signal<SysRole[]>([]);

  readonly form = this.fb.group({
    userId: [undefined as number | undefined],
    userName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20)]],
    nickName: ['', [Validators.required]],
    password: [''],
    deptId: [undefined as number | undefined],
    phonenumber: ['', [Validators.pattern(/^1[3|4|5|6|7|8|9][0-9]\d{8}$/)]],
    email: ['', [Validators.email]],
    sex: [''],
    status: ['0'],
    postIds: [[] as number[]],
    roleIds: [[] as number[]],
    remark: [''],
  });

  readonly isEdit = computed(() => this.form.controls.userId.value != null);
  readonly statusOptions = computed(() => this.dictStore.getDict('sys_normal_disable') ?? []);
  readonly sexOptions = computed(() => this.dictStore.getDict('sys_user_sex') ?? []);

  readonly newPassword = signal('');

  readonly importVisible = signal(false);
  readonly updateSupport = signal(false);

  @ViewChild('pwdTpl') pwdTpl?: TemplateRef<unknown>;

  ngOnInit(): void {
    this.loadDicts();
    this.loadDeptTree();
    // nz-table 的 (nzQueryParams) 带 skip(1)，首次进入不会触发，需显式发起首查
    this.getList();
  }

  private loadDicts(): void {
    for (const type of ['sys_normal_disable', 'sys_user_sex']) {
      if (!this.dictStore.getDict(type)) {
        this.dictStore.loadDict(type).subscribe();
      }
    }
  }

  private loadDeptTree(): void {
    this.api.deptTreeSelect().subscribe({
      next: (res) => {
        const nodes = toTreeNodes(res.data ?? []);
        this.deptNodes.set(nodes);
        this.deptOptions.set(nodes);
      },
    });
  }

  /** 组装查询参数（含日期范围） */
  private buildQuery(): PageQuery {
    const value = this.searchForm.getRawValue();
    const query: PageQuery = {
      pageNum: this.pageNum(),
      pageSize: this.pageSize(),
      userName: value.userName || undefined,
      phonenumber: value.phonenumber || undefined,
      status: value.status || undefined,
      deptId: this.deptId(),
    };
    const range = this.dateRange()?.length
      ? [
          parseTime(this.dateRange()[0], '{y}-{m}-{d}') ?? '',
          parseTime(this.dateRange()[1], '{y}-{m}-{d}') ?? '',
        ]
      : [];
    return addDateRange(query, range);
  }

  getList(): void {
    this.loading.set(true);
    this.api.listUser(this.buildQuery()).subscribe({
      next: (res) => {
        this.rows.set(res.rows ?? []);
        this.total.set(res.total ?? 0);
        this.loading.set(false);
        this.selection.refresh(this.rows());
      },
      error: () => this.loading.set(false),
    });
  }

  onQueryParams(params: NzTableQueryParams): void {
    this.pageNum.set(params.pageIndex);
    this.pageSize.set(params.pageSize);
    this.getList();
  }

  onDeptSelect(event: NzFormatEmitEvent): void {
    const key = event.node?.key;
    this.deptId.set(key ? Number(key) : undefined);
    this.pageNum.set(1);
    this.getList();
  }

  resetQuery(): void {
    this.searchForm.reset({ userName: '', phonenumber: '', status: '' });
    this.dateRange.set([]);
    this.deptId.set(undefined);
    this.pageNum.set(1);
    this.getList();
  }

  private selectedRows(): SysUser[] {
    return this.selection.selectedRows(this.rows());
  }

  openAdd(): void {
    this.resetForm();
    this.api.getUser('').subscribe({
      next: (res) => {
        this.posts.set(res.posts ?? []);
        this.roles.set(res.roles ?? []);
        this.dialogTitle.set('添加用户');
        this.dialogVisible.set(true);
      },
    });
  }

  openEdit(row: SysUser): void {
    this.resetForm();
    this.api.getUser(row.userId).subscribe({
      next: (res) => {
        this.posts.set(res.posts ?? []);
        this.roles.set(res.roles ?? []);
        const user = res.data ?? row;
        this.form.patchValue({
          userId: user.userId,
          userName: user.userName ?? '',
          nickName: user.nickName ?? '',
          deptId: user.deptId,
          phonenumber: user.phonenumber ?? '',
          email: user.email ?? '',
          sex: user.sex ?? '',
          status: user.status ?? '0',
          postIds: res.postIds ?? [],
          roleIds: res.roleIds ?? [],
          remark: user.remark ?? '',
          password: '',
        });
        this.dialogTitle.set('修改用户');
        this.dialogVisible.set(true);
      },
    });
  }

  private resetForm(): void {
    this.form.reset({
      userId: undefined,
      userName: '',
      nickName: '',
      password: '',
      deptId: undefined,
      phonenumber: '',
      email: '',
      sex: '',
      status: '0',
      postIds: [],
      roleIds: [],
      remark: '',
    });
  }

  submitForm(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue();
    const request$ = this.isEdit()
      ? this.api.updateUser(value as SysUser)
      : this.api.addUser(value as SysUser);
    request$.subscribe({
      next: () => {
        this.message.success(this.isEdit() ? '修改成功' : '新增成功');
        this.submitting.set(false);
        this.dialogVisible.set(false);
        this.getList();
      },
      error: () => this.submitting.set(false),
    });
  }

  delete(row?: SysUser): void {
    const targets = row ? [row] : this.selectedRows();
    if (!targets.length) {
      return;
    }
    const ids = targets.map((item) => item.userId).join(',');
    const names = targets.map((item) => item.userName).join('、');
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认删除用户名称为「${names}」的数据项？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.api.delUser(ids).subscribe({
          next: () => {
            this.message.success('删除成功');
            this.selection.clear();
            this.getList();
          },
        });
      },
    });
  }

  resetPwd(row: SysUser): void {
    this.newPassword.set('');
    this.modal.create({
      nzTitle: `重置「${row.userName}」的密码`,
      nzContent: this.pwdTpl,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOnOk: () => {
        const password = this.newPassword()?.trim();
        if (!password || password.length < 5 || password.length > 20) {
          this.message.warning('密码长度必须介于 5 和 20 之间');
          return false;
        }
        this.api.resetUserPwd(row.userId!, password).subscribe({
          next: () => this.message.success(`修改成功，新密码是：${password}`),
        });
        return true;
      },
    });
  }

  /**
   * 切换用户状态。
   * 开关是单向绑定，取消确认后绑定值不变则不会回弹，
   * 故先乐观更新让数据与开关一致，取消或失败时再回滚。
   */
  statusChange(row: SysUser, checked: boolean): void {
    const next = checked ? '0' : '1';
    const previous = row.status ?? '0';
    if (next === previous) {
      return;
    }
    const text = next === '0' ? '启用' : '停用';
    this.setRowStatus(row.userId, next);
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `确认要${text}「${row.userName}」用户吗？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOnOk: () => {
        this.api.changeUserStatus(row.userId!, next).subscribe({
          next: () => this.message.success(`${text}成功`),
          error: () => this.setRowStatus(row.userId, previous),
        });
      },
      nzOnCancel: () => this.setRowStatus(row.userId, previous),
    });
  }

  /** 以不可变方式更新行状态，保证开关绑定值随数据变化 */
  private setRowStatus(userId: number | undefined, status: string): void {
    if (userId === undefined) {
      return;
    }
    this.rows.update((list) =>
      list.map((item) => (item.userId === userId ? { ...item, status } : item)),
    );
  }

  authRole(row: SysUser): void {
    void this.router.navigate(['/system/user-auth/role', row.userId]);
  }

  export(): void {
    const query = this.buildQuery();
    const params: Record<string, unknown> = Object.fromEntries(
      Object.entries(query).filter(([key]) => key !== 'pageNum' && key !== 'pageSize'),
    );
    const filename = `user_${parseTime(new Date(), '{y}{m}{d}{h}{i}{s}')}.xlsx`;
    this.download.download('/system/user/export', params, filename).subscribe({
      next: () => this.message.success('导出成功'),
    });
  }

  /** 导入用户数据 */
  importRequest = (item: NzUploadXHRArgs) => {
    const formData = new FormData();
    formData.append('file', item.file as unknown as File);
    return this.api.importData(formData, this.updateSupport()).subscribe({
      next: (res) => {
        if (res.code === 200) {
          item.onSuccess?.(res, item.file, undefined);
          this.message.success(res.msg || '导入成功');
          this.importVisible.set(false);
          this.getList();
        } else {
          item.onError?.(new Error(res.msg), item.file);
          this.message.error(res.msg || '导入失败');
        }
      },
      error: () => {
        item.onError?.(new Error('导入失败'), item.file);
        this.message.error('导入失败，请检查文件格式');
      },
    });
  };
}
