import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
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
import { DspDataSourceApi } from '@api/dsp/datasource';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import { TableSelection } from '@shared/utils/table-selection';
import { PageQuery } from '@core/models/result';
import { DspDataSource, DspDataSourceTestResult } from '@core/models/dsp';
import { environment } from '@env/environment';

/** 数据源管理页 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dsp-datasource-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    HasPermiDirective,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
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
  templateUrl: './datasource.html',
  styleUrl: './datasource.less',
})
export class DspDataSourcePage implements OnInit {
  private readonly api = inject(DspDataSourceApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);

  readonly searchForm = this.fb.nonNullable.group({
    name: [''],
    status: [''],
  });

  readonly rows = signal<DspDataSource[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageNum = signal(1);
  readonly pageSize = signal(environment.pageSize);
  readonly selection = new TableSelection<DspDataSource, number>((row) => row.dataSourceId);

  readonly statusOptions = [
    { value: '0', label: '正常' },
    { value: '1', label: '停用' },
  ];

  /* ---------------- 编辑弹窗 ---------------- */
  readonly editorVisible = signal(false);
  readonly editorTitle = signal('');
  readonly editorSubmitting = signal(false);
  readonly editorForm = this.fb.nonNullable.group({
    dataSourceId: [undefined as number | undefined],
    name: ['', [Validators.required]],
    dbType: [''],
    driverClassName: ['', [Validators.required]],
    url: ['', [Validators.required]],
    username: [''],
    password: [''],
    status: ['0'],
    remark: [''],
  });
  /** 是否编辑态：表单值不是 signal，必须用 getter 实时读取（computed 会缓存首次结果） */
  get isEdit(): boolean {
    return this.editorForm.controls.dataSourceId.value != null;
  }

  /* ---------------- 连接测试 ---------------- */
  readonly testing = signal(false);
  readonly testResult = signal<DspDataSourceTestResult | null>(null);

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
    this.api.listDataSource(this.buildQuery()).subscribe({
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

  selectedRows(): DspDataSource[] {
    return this.selection.selectedRows(this.rows());
  }

  statusMeta(status?: string): { label: string; color: string } {
    return status === '1'
      ? { label: '停用', color: 'default' }
      : { label: '正常', color: 'success' };
  }

  /* ---------------- 编辑 ---------------- */

  openAdd(): void {
    this.editorForm.reset({
      dataSourceId: undefined,
      name: '',
      dbType: '',
      driverClassName: '',
      url: '',
      username: '',
      password: '',
      status: '0',
      remark: '',
    });
    this.testResult.set(null);
    this.editorTitle.set('新增数据源');
    this.editorVisible.set(true);
  }

  openEdit(row: DspDataSource): void {
    if (row.dataSourceId == null) {
      return;
    }
    this.api.getDataSource(row.dataSourceId).subscribe({
      next: (res) => {
        const data = res.data;
        if (!data) {
          return;
        }
        this.editorForm.reset({
          dataSourceId: data.dataSourceId,
          name: data.name ?? '',
          dbType: data.dbType ?? '',
          driverClassName: data.driverClassName ?? '',
          url: data.url ?? '',
          username: data.username ?? '',
          // 详情接口不回传口令：留空即「沿用已保存口令」，提交时也不会带该字段
          password: '',
          status: data.status ?? '0',
          remark: data.remark ?? '',
        });
        this.testResult.set(null);
        this.editorTitle.set('编辑数据源');
        this.editorVisible.set(true);
      },
    });
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
    const value = this.editorForm.getRawValue();
    const payload: DspDataSource = {
      dataSourceId: value.dataSourceId ?? undefined,
      name: value.name,
      dbType: value.dbType,
      driverClassName: value.driverClassName,
      url: value.url,
      username: value.username,
      status: value.status,
      remark: value.remark,
    };
    // 口令留空表示沿用已保存口令：不提交该字段，否则会被更新 SQL 当成新口令写空
    if (value.password) {
      payload.password = value.password;
    }
    const request$ = this.isEdit
      ? this.api.updateDataSource(payload)
      : this.api.addDataSource(payload);
    request$.subscribe({
      next: () => {
        this.message.success(this.isEdit ? '修改成功' : '新增成功');
        this.editorSubmitting.set(false);
        this.editorVisible.set(false);
        this.getList();
      },
      error: () => this.editorSubmitting.set(false),
    });
  }

  /** 弹窗内测试当前表单配置 */
  testEditor(): void {
    const value = this.editorForm.getRawValue();
    if (!value.driverClassName || !value.url) {
      this.message.warning('请先填写驱动类名与 JDBC URL');
      return;
    }
    this.runTest({
      dataSourceId: value.dataSourceId ?? undefined,
      name: value.name,
      driverClassName: value.driverClassName,
      url: value.url,
      username: value.username,
      password: value.password,
    });
  }

  /** 列表行测试已保存的数据源 */
  testRow(row: DspDataSource): void {
    this.runTest({ dataSourceId: row.dataSourceId, name: row.name });
  }

  private runTest(data: DspDataSource): void {
    this.testing.set(true);
    this.testResult.set(null);
    this.api.testConnection(data).subscribe({
      next: (res) => {
        this.testing.set(false);
        this.testResult.set(res.data ?? null);
        if (res.data?.success) {
          this.message.success('连接成功');
        } else {
          this.message.error(res.data?.message ?? '连接失败');
        }
      },
      error: () => this.testing.set(false),
    });
  }

  deleteDataSource(row?: DspDataSource): void {
    const targets = row ? [row] : this.selectedRows();
    if (!targets.length) {
      return;
    }
    const ids = targets.map((item) => item.dataSourceId as number);
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: '是否确认删除选中的数据源？已被脚本引用的数据源无法删除。',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve) => {
          this.api.delDataSource(ids).subscribe({
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
}
