import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
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
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { OauthApiKeyApi, OauthApiKeyPayload } from '@api/oauth/apikey';
import { UserApi } from '@api/system/user';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import { TableSelection } from '@shared/utils/table-selection';
import { PageQuery } from '@core/models/result';
import { OauthApiKey } from '@core/models/oauth';
import { parseTime } from '@core/utils/ruoyi';
import { environment } from '@env/environment';

/** API Key 授权管理页 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-oauth-apikey-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    HasPermiDirective,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzDatePickerModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    NzTooltipModule,
  ],
  templateUrl: './apikey.html',
  styleUrl: './apikey.less',
})
export class ApikeyPage implements OnInit {
  private readonly api = inject(OauthApiKeyApi);
  private readonly userApi = inject(UserApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);

  readonly searchForm = this.fb.nonNullable.group({
    name: [''],
    status: [''],
  });

  readonly rows = signal<OauthApiKey[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageNum = signal(1);
  readonly pageSize = signal(environment.pageSize);
  readonly selection = new TableSelection<OauthApiKey, number>((row) => row.keyId);

  readonly statusOptions = [
    { value: '0', label: '正常' },
    { value: '1', label: '停用' },
  ];

  /* ---------------- 编辑弹窗 ---------------- */
  readonly editorVisible = signal(false);
  readonly editorTitle = signal('');
  readonly editorSubmitting = signal(false);
  readonly editorForm = this.fb.group({
    keyId: [undefined as number | undefined],
    name: ['', [Validators.required]],
    userId: [undefined as number | undefined, [Validators.required]],
    status: ['0'],
    /** Date 对象；为空表示永久有效 */
    expiresTime: [null as Date | null],
    remark: [''],
  });

  /** 绑定用户下拉；无 system:user:list 权限时退化为手动输入用户ID */
  readonly userOptions = signal<{ value: number; label: string }[]>([]);
  readonly userOptionsFailed = signal(false);

  /** 是否编辑态：表单值不是 signal，必须用 getter 实时读取（computed 会缓存首次结果） */
  get isEdit(): boolean {
    return this.editorForm.controls.keyId.value != null;
  }

  /* ---------------- 明文密钥展示（仅一次） ---------------- */
  readonly keyVisible = signal(false);
  readonly keyText = signal('');

  ngOnInit(): void {
    this.getList();
  }

  private buildQuery(): PageQuery {
    const value = this.searchForm.getRawValue();
    return {
      pageNum: this.pageNum(),
      pageSize: this.pageSize(),
      name: value.name || undefined,
      status: value.status || undefined,
    };
  }

  getList(): void {
    this.loading.set(true);
    this.api.listKey(this.buildQuery()).subscribe({
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

  resetQuery(): void {
    this.searchForm.reset({ name: '', status: '' });
    this.pageNum.set(1);
    this.getList();
  }

  selectedRows(): OauthApiKey[] {
    return this.selection.selectedRows(this.rows());
  }

  statusMeta(status?: string): { label: string; color: string } {
    return status === '1' ? { label: '停用', color: 'error' } : { label: '正常', color: 'success' };
  }

  /** 过期展示：为空表示永久 */
  expiresLabel(expiresTime?: string): string {
    return expiresTime ? expiresTime : '永久';
  }

  /* ---------------- 新增 / 修改 ---------------- */

  openAdd(): void {
    this.loadUsers();
    this.editorForm.reset({
      keyId: undefined,
      name: '',
      userId: undefined,
      status: '0',
      expiresTime: null,
      remark: '',
    });
    this.editorTitle.set('新增密钥');
    this.editorVisible.set(true);
  }

  openEdit(row: OauthApiKey): void {
    if (row.keyId == null) {
      return;
    }
    this.loadUsers();
    this.api.getKey(row.keyId).subscribe({
      next: (res) => {
        const data = res.data;
        if (!data) {
          return;
        }
        this.editorForm.reset({
          keyId: data.keyId,
          name: data.name ?? '',
          userId: data.userId ?? undefined,
          status: data.status ?? '0',
          expiresTime: this.toDate(data.expiresTime),
          remark: data.remark ?? '',
        });
        this.editorTitle.set('修改密钥');
        this.editorVisible.set(true);
      },
    });
  }

  /** 加载绑定用户下拉；失败（多为缺少 system:user:list 权限）时允许手动输入用户ID */
  private loadUsers(): void {
    this.userOptionsFailed.set(false);
    this.userApi.listUser({ pageNum: 1, pageSize: 100 }).subscribe({
      next: (res) =>
        this.userOptions.set(
          (res.rows ?? []).map((item) => ({
            value: item.userId as number,
            label: `${item.nickName ?? ''}（${item.userName ?? ''}）`,
          })),
        ),
      error: () => this.userOptionsFailed.set(true),
    });
  }

  private toDate(value?: string): Date | null {
    if (!value) {
      return null;
    }
    // 与 parseTime 一致：把 yyyy-MM-dd HH:mm:ss 归一为本地时间可解析形式
    const normalized = value
      .replace(/-/g, '/')
      .replace('T', ' ')
      .replace(/\.[\d]{3}/, '');
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toPayload(): OauthApiKeyPayload {
    const value = this.editorForm.getRawValue();
    return {
      keyId: value.keyId ?? undefined,
      name: value.name ?? '',
      userId: value.userId ?? undefined,
      status: value.status ?? '0',
      // 为空表示永久有效，显式传 null 由后端清空原过期时间
      expiresTime: value.expiresTime
        ? (parseTime(value.expiresTime, '{y}-{m}-{d} {h}:{i}:{s}') ?? null)
        : null,
      remark: value.remark ?? '',
    };
  }

  submitEditor(): void {
    if (this.editorForm.invalid) {
      Object.values(this.editorForm.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }
    this.editorSubmitting.set(true);
    const payload = this.toPayload();
    const request$ = payload.keyId ? this.api.updateKey(payload) : this.api.addKey(payload);
    request$.subscribe({
      next: (res) => {
        this.editorSubmitting.set(false);
        this.editorVisible.set(false);
        this.getList();
        // 明文只在创建响应里出现一次，立即展示，关闭后无法再查看
        if (res.apiKey) {
          this.showKey(res.apiKey);
        } else {
          this.message.success('保存成功');
        }
      },
      error: () => this.editorSubmitting.set(false),
    });
  }

  /* ---------------- 重置 ---------------- */

  resetKey(row: OauthApiKey): void {
    if (row.keyId == null) {
      return;
    }
    this.modal.confirm({
      nzTitle: '重置密钥',
      nzContent: `确认重置密钥「${row.name}」？重置后旧密钥立即失效，新密钥仅展示一次，请妥善保存。`,
      nzOkText: '重置',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve) => {
          this.api.resetKey(row.keyId as number).subscribe({
            next: (res) => {
              this.getList();
              if (res.apiKey) {
                this.showKey(res.apiKey);
              }
              resolve();
            },
            error: () => resolve(),
          });
        }),
    });
  }

  /* ---------------- 删除 ---------------- */

  deleteKey(row?: OauthApiKey): void {
    const targets = row ? [row] : this.selectedRows();
    if (!targets.length) {
      return;
    }
    const ids = targets.map((item) => item.keyId as number);
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: '是否确认删除选中的密钥？删除后使用该密钥的调用方将立即失效。',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve) => {
          this.api.delKey(ids).subscribe({
            next: () => {
              this.message.success('删除成功');
              this.selection.clear();
              this.getList();
              resolve();
            },
            error: () => resolve(),
          });
        }),
    });
  }

  /* ---------------- 明文密钥展示与复制 ---------------- */

  private showKey(apiKey: string): void {
    this.keyText.set(apiKey);
    this.keyVisible.set(true);
  }

  async copyKey(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.keyText());
      this.message.success('复制成功');
    } catch {
      this.copyFallback(this.keyText());
    }
  }

  /** 非安全上下文（如 http 访问）下 clipboard API 不可用，退回到 execCommand */
  private copyFallback(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (ok) {
      this.message.success('复制成功');
    } else {
      this.message.error('复制失败');
    }
  }
}
