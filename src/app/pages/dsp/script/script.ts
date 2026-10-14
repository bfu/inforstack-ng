import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { DspScriptApi } from '@api/dsp/script';
import { DspDataSourceApi } from '@api/dsp/datasource';
import { MonacoEditorComponent } from '@shared/components/monaco-editor/monaco-editor';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import { TableSelection } from '@shared/utils/table-selection';
import { PageQuery } from '@core/models/result';
import {
  DspDataSource,
  DspExecutionResult,
  DspScript,
  DspScriptVersion,
  DspValidationResult,
} from '@core/models/dsp';
import { environment } from '@env/environment';

/** 动态脚本管理页 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dsp-script-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MonacoEditorComponent,
    HasPermiDirective,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzDividerModule,
    NzDrawerModule,
    NzEmptyModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    NzTooltipModule,
  ],
  templateUrl: './script.html',
  styleUrl: './script.less',
})
export class DspScriptPage implements OnInit {
  private readonly api = inject(DspScriptApi);
  private readonly dataSourceApi = inject(DspDataSourceApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);

  readonly searchForm = this.fb.nonNullable.group({
    name: [''],
    slug: [''],
    status: [''],
  });

  readonly rows = signal<DspScript[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageNum = signal(1);
  readonly pageSize = signal(environment.pageSize);
  readonly selection = new TableSelection<DspScript, number>((row) => row.scriptId);

  readonly statusOptions = [
    { value: '0', label: '草稿' },
    { value: '1', label: '已发布' },
    { value: '2', label: '已下线' },
  ];

  /* ---------------- 数据源（脚本绑定） ---------------- */
  readonly dataSources = signal<DspDataSource[]>([]);
  readonly dataSourceOptions = computed(() => [
    { value: 0, label: '默认主库' },
    ...this.dataSources().map((item) => ({
      value: item.dataSourceId as number,
      label: item.name ?? '',
    })),
  ]);

  /* ---------------- 编辑弹窗 ---------------- */
  readonly editorVisible = signal(false);
  readonly editorTitle = signal('');
  readonly editorSubmitting = signal(false);
  readonly editorForm = this.fb.group({
    scriptId: [undefined as number | undefined],
    name: ['', [Validators.required]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-zA-Z][a-zA-Z0-9_-]*$/)]],
    description: [''],
    dataSourceId: [0 as number],
  });
  readonly editorXml = signal('');
  /** 是否编辑态：表单值不是 signal，必须用 getter 实时读取（computed 会缓存首次结果） */
  get isEdit(): boolean {
    return this.editorForm.controls.scriptId.value != null;
  }
  readonly validating = signal(false);
  readonly validation = signal<DspValidationResult | null>(null);

  /* ---------------- 测试抽屉 ---------------- */
  readonly testVisible = signal(false);
  readonly testScript = signal<DspScript | null>(null);
  readonly testStatement = signal<string | undefined>(undefined);
  readonly testParams = signal('{}');
  readonly testing = signal(false);
  readonly testResult = signal<DspExecutionResult | null>(null);
  readonly testStatements = signal<string[]>([]);
  readonly testColumns = computed(() => {
    const list = this.testResult()?.rows ?? [];
    return list.length > 0 ? Object.keys(list[0]) : [];
  });

  /* ---------------- 版本抽屉 ---------------- */
  readonly versionVisible = signal(false);
  readonly versionScript = signal<DspScript | null>(null);
  readonly versions = signal<DspScriptVersion[]>([]);
  readonly versionsLoading = signal(false);

  /* ---------------- 快照查看 ---------------- */
  readonly snapshotVisible = signal(false);
  readonly snapshotTitle = signal('');
  readonly snapshotXml = signal('');

  ngOnInit(): void {
    this.getList();
    this.loadDataSources();
  }

  private loadDataSources(): void {
    this.dataSourceApi.listOptions().subscribe({
      next: (res) => this.dataSources.set(res.data ?? []),
    });
  }

  /** 数据源名称展示（0/空为默认主库） */
  dataSourceLabel(dataSourceId?: number): string {
    if (dataSourceId == null || dataSourceId === 0) {
      return '默认主库';
    }
    return (
      this.dataSources().find((item) => item.dataSourceId === dataSourceId)?.name ??
      `#${dataSourceId}`
    );
  }

  private buildQuery(): PageQuery {
    const value = this.searchForm.getRawValue();
    return {
      pageNum: this.pageNum(),
      pageSize: this.pageSize(),
      name: value.name || undefined,
      slug: value.slug || undefined,
      status: value.status || undefined,
    };
  }

  getList(): void {
    this.loading.set(true);
    this.api.listScript(this.buildQuery()).subscribe({
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
    this.searchForm.reset({ name: '', slug: '', status: '' });
    this.pageNum.set(1);
    this.getList();
  }

  selectedRows(): DspScript[] {
    return this.selection.selectedRows(this.rows());
  }

  statusMeta(status?: string): { label: string; color: string } {
    switch (status) {
      case '1':
        return { label: '已发布', color: 'success' };
      case '2':
        return { label: '已下线', color: 'default' };
      default:
        return { label: '草稿', color: 'warning' };
    }
  }

  /* ---------------- 编辑 ---------------- */

  private defaultXml(): string {
    return [
      '<!-- 一条脚本只写一条语句，不用写 id：平台按脚本标识(slug)填充 id，并补 mapper 标签与 namespace -->',
      '<select resultType="map">',
      '  select 1 as id',
      '</select>',
      '',
    ].join('\n');
  }

  openAdd(): void {
    // 页面可能被页签复用（不重新 ngOnInit），打开弹窗前刷新数据源，避免下拉遗漏新增项
    this.loadDataSources();
    this.editorForm.reset({
      scriptId: undefined,
      name: '',
      slug: '',
      description: '',
      dataSourceId: 0,
    });
    this.editorForm.controls.slug.enable();
    this.editorXml.set(this.defaultXml());
    this.validation.set(null);
    this.editorTitle.set('新增脚本');
    this.editorVisible.set(true);
  }

  openEdit(row: DspScript): void {
    if (row.scriptId == null) {
      return;
    }
    this.loadDataSources();
    this.api.getScript(row.scriptId).subscribe({
      next: (res) => {
        const data = res.data;
        if (!data) {
          return;
        }
        this.editorForm.reset({
          scriptId: data.scriptId,
          name: data.name ?? '',
          slug: data.slug ?? '',
          description: data.description ?? '',
          dataSourceId: data.dataSourceId ?? 0,
        });
        // 脚本标识创建后不可修改（后端会忽略变更），直接禁用避免误改
        this.editorForm.controls.slug.disable();
        this.editorXml.set(data.content ?? this.defaultXml());
        this.validation.set(null);
        this.editorTitle.set('编辑脚本');
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
    if (!this.editorXml().trim()) {
      this.message.warning('脚本内容不能为空');
      return;
    }
    this.editorSubmitting.set(true);
    const value = this.editorForm.getRawValue();
    const payload: DspScript = {
      scriptId: value.scriptId ?? undefined,
      name: value.name ?? '',
      slug: value.slug ?? '',
      description: value.description ?? '',
      dataSourceId: value.dataSourceId ?? 0,
      content: this.editorXml(),
    };
    const request$ = this.isEdit ? this.api.updateScript(payload) : this.api.addScript(payload);
    request$.subscribe({
      next: () => {
        this.message.success(this.isEdit ? '保存成功' : '新增成功');
        this.editorSubmitting.set(false);
        this.editorVisible.set(false);
        this.getList();
      },
      error: () => this.editorSubmitting.set(false),
    });
  }

  validateEditor(): void {
    const scriptId = this.editorForm.controls.scriptId.value;
    if (scriptId == null) {
      this.message.warning('请先保存脚本后再校验');
      return;
    }
    this.validating.set(true);
    this.api.validate(scriptId, this.editorXml()).subscribe({
      next: (res) => {
        const data = res.data ?? null;
        this.validation.set(data);
        this.validating.set(false);
        const warningCount = data?.warnings?.length ?? 0;
        if (!data?.valid) {
          this.message.error(`校验未通过（${data?.errors?.length ?? 0} 个错误）`);
        } else if (warningCount > 0) {
          // 有方言提示时不能只弹绿色「校验通过」，否则告警会被忽略
          this.message.warning(`校验通过，但存在 ${warningCount} 条方言提示，请确认`, {
            nzDuration: 8000,
          });
        } else {
          this.message.success('校验通过');
        }
      },
      error: () => this.validating.set(false),
    });
  }

  /* ---------------- 发布 / 下线 / 删除 ---------------- */

  publishScript(row: DspScript): void {
    if (row.scriptId == null) {
      return;
    }
    this.modal.confirm({
      nzTitle: '发布确认',
      nzContent: `确认发布脚本「${row.name}」？发布后将立即热加载生效。`,
      nzOkText: '发布',
      nzCancelText: '取消',
      nzOnOk: () =>
        new Promise<void>((resolve) => {
          this.api.publish(row.scriptId as number).subscribe({
            next: (res) => {
              this.message.success(`发布成功，当前版本 v${res.data}`);
              this.getList();
              resolve();
            },
            error: () => resolve(),
          });
        }),
    });
  }

  offlineScript(row: DspScript): void {
    if (row.scriptId == null) {
      return;
    }
    this.modal.confirm({
      nzTitle: '下线确认',
      nzContent: `确认下线脚本「${row.name}」？下线后将无法通过统一接口执行。`,
      nzOkText: '下线',
      nzOkDanger: true,
      nzCancelText: '取消',
      nzOnOk: () =>
        new Promise<void>((resolve) => {
          this.api.offline(row.scriptId as number).subscribe({
            next: () => {
              this.message.success('下线成功');
              this.getList();
              resolve();
            },
            error: () => resolve(),
          });
        }),
    });
  }

  deleteScript(row?: DspScript): void {
    const targets = row ? [row] : this.selectedRows();
    if (!targets.length) {
      return;
    }
    const ids = targets.map((item) => item.scriptId as number);
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: '是否确认删除选中的脚本？删除后版本历史一并清除。',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve) => {
          this.api.delScript(ids).subscribe({
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

  reload(): void {
    this.api.reload().subscribe({
      next: () => this.message.success('重新加载成功'),
    });
  }

  /* ---------------- 测试 ---------------- */

  openTest(row: DspScript): void {
    if (row.scriptId == null) {
      return;
    }
    this.testScript.set(row);
    this.testResult.set(null);
    this.testParams.set('{}');
    this.testStatement.set(undefined);
    this.testStatements.set([]);
    this.testVisible.set(true);
    // 先校验草稿以获取可执行语句列表
    this.api.validate(row.scriptId).subscribe({
      next: (res) => {
        const data = res.data;
        this.testStatements.set(data?.statements ?? []);
        if (data?.statements?.length) {
          this.testStatement.set(data.statements[0]);
        }
      },
    });
  }

  runTest(): void {
    const script = this.testScript();
    const statementId = this.testStatement();
    if (script?.scriptId == null || !statementId) {
      this.message.warning('请选择要执行的语句');
      return;
    }
    let params: Record<string, unknown> | undefined;
    try {
      const text = this.testParams().trim();
      params = text ? (JSON.parse(text) as Record<string, unknown>) : undefined;
    } catch {
      this.message.error('参数 JSON 格式错误');
      return;
    }
    this.testing.set(true);
    this.api.test(script.scriptId, statementId, params).subscribe({
      next: (res) => {
        this.testResult.set(res.data ?? null);
        this.testing.set(false);
        this.message.success('执行完成（已回滚）');
      },
      error: () => this.testing.set(false),
    });
  }

  /* ---------------- 版本 ---------------- */

  openVersions(row: DspScript): void {
    if (row.scriptId == null) {
      return;
    }
    this.versionScript.set(row);
    this.versions.set([]);
    this.versionVisible.set(true);
    this.versionsLoading.set(true);
    this.api.listVersions(row.scriptId).subscribe({
      next: (res) => {
        this.versions.set(res.data ?? []);
        this.versionsLoading.set(false);
      },
      error: () => this.versionsLoading.set(false),
    });
  }

  viewVersion(version: DspScriptVersion): void {
    if (version.versionId == null) {
      return;
    }
    this.api.getVersion(version.versionId).subscribe({
      next: (res) => {
        this.snapshotTitle.set(`版本 v${version.version} 内容快照`);
        this.snapshotXml.set(res.data?.content ?? '');
        this.snapshotVisible.set(true);
      },
    });
  }

  rollbackVersion(version: DspScriptVersion): void {
    const script = this.versionScript();
    if (script?.scriptId == null || version.versionId == null) {
      return;
    }
    const targetLabel = this.dataSourceLabel(version.dataSourceId);
    const currentLabel = this.dataSourceLabel(script.dataSourceId);
    const switchTip =
      targetLabel === currentLabel ? '' : `，数据源将由「${currentLabel}」切换为「${targetLabel}」`;
    this.modal.confirm({
      nzTitle: '回滚确认',
      nzContent: `确认回滚到版本 v${version.version}？回滚将还原该版本的内容与数据源${switchTip}，立即热加载生效。`,
      nzOkText: '回滚',
      nzCancelText: '取消',
      nzOnOk: () =>
        new Promise<void>((resolve) => {
          this.api.rollback(script.scriptId as number, version.versionId as number).subscribe({
            next: () => {
              this.message.success('回滚成功');
              this.versionVisible.set(false);
              this.getList();
              resolve();
            },
            error: () => resolve(),
          });
        }),
    });
  }
}
