import {
  Component,
  OnInit,
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
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
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
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { JobApi } from '@api/monitor/job';
import { DownloadService } from '@core/download.service';
import { PageQuery } from '@core/models/result';
import { SysJob } from '@core/models/monitor';
import { parseTime } from '@core/utils/ruoyi';
import { DictStore } from '@store/dict.store';
import { DictTag } from '@shared/components/dict-tag/dict-tag';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import { TableSelection } from '@shared/utils/table-selection';
import { environment } from '@env/environment';

/** 执行策略选项，对应后端 ScheduleConstants.MISFIRE_* */
const MISFIRE_OPTIONS = [
  { value: '0', label: '默认策略' },
  { value: '1', label: '立即执行' },
  { value: '2', label: '执行一次' },
  { value: '3', label: '放弃执行' },
];

/** 是否并发选项：0允许 1禁止 */
const CONCURRENT_OPTIONS = [
  { value: '0', label: '允许' },
  { value: '1', label: '禁止' },
];

/** 定时任务，对应 ruoyi-vue3/src/views/monitor/job/index.vue */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-job-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DictTag,
    HasPermiDirective,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzDescriptionsModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzRadioModule,
    NzSelectModule,
    NzSwitchModule,
    NzTableModule,
    NzTagModule,
    NzTooltipModule,
  ],
  templateUrl: './job.html',
  styleUrl: './job.less',
})
export class JobPage implements OnInit {
  private readonly api = inject(JobApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly download = inject(DownloadService);
  private readonly dictStore = inject(DictStore);
  private readonly router = inject(Router);

  readonly searchForm = this.fb.nonNullable.group({
    jobName: [''],
    jobGroup: [''],
    status: [''],
  });

  readonly rows = signal<SysJob[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageNum = signal(1);
  readonly pageSize = signal(environment.pageSize);

  /** 表格多选状态 */
  readonly selection = new TableSelection<SysJob, number>((row) => row.jobId);

  readonly dialogVisible = signal(false);
  readonly dialogTitle = signal('');
  readonly submitting = signal(false);

  readonly detailVisible = signal(false);
  readonly detailRow = signal<SysJob | null>(null);

  readonly form = this.fb.group({
    jobId: [undefined as number | undefined],
    jobName: ['', [Validators.required]],
    jobGroup: ['DEFAULT'],
    invokeTarget: ['', [Validators.required]],
    cronExpression: ['', [Validators.required]],
    misfirePolicy: ['1'],
    concurrent: ['1'],
    status: ['0'],
  });

  readonly misfireOptions = MISFIRE_OPTIONS;
  readonly concurrentOptions = CONCURRENT_OPTIONS;

  readonly isEdit = computed(() => this.form.controls.jobId.value != null);
  readonly jobGroupOptions = computed(() => this.dictStore.getDict('sys_job_group') ?? []);
  readonly jobStatusOptions = computed(() => this.dictStore.getDict('sys_job_status') ?? []);
  readonly detailMisfireText = computed(
    () =>
      MISFIRE_OPTIONS.find((item) => item.value === this.detailRow()?.misfirePolicy)?.label ?? '',
  );

  ngOnInit(): void {
    for (const type of ['sys_job_group', 'sys_job_status']) {
      if (!this.dictStore.getDict(type)) {
        this.dictStore.loadDict(type).subscribe();
      }
    }
    this.getList();
  }

  private buildQuery(): PageQuery {
    const value = this.searchForm.getRawValue();
    return {
      pageNum: this.pageNum(),
      pageSize: this.pageSize(),
      jobName: value.jobName || undefined,
      jobGroup: value.jobGroup || undefined,
      status: value.status || undefined,
    };
  }

  getList(): void {
    this.loading.set(true);
    this.api.listJob(this.buildQuery()).subscribe({
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
    this.searchForm.reset({ jobName: '', jobGroup: '', status: '' });
    this.pageNum.set(1);
    this.getList();
  }

  selectedRows(): SysJob[] {
    return this.selection.selectedRows(this.rows());
  }

  openAdd(): void {
    this.resetForm();
    this.dialogTitle.set('添加任务');
    this.dialogVisible.set(true);
  }

  openEdit(row: SysJob): void {
    this.resetForm();
    this.form.patchValue({
      jobId: row.jobId,
      jobName: row.jobName ?? '',
      jobGroup: row.jobGroup ?? 'DEFAULT',
      invokeTarget: row.invokeTarget ?? '',
      cronExpression: row.cronExpression ?? '',
      misfirePolicy: row.misfirePolicy ?? '1',
      concurrent: row.concurrent ?? '1',
      status: row.status ?? '0',
    });
    this.dialogTitle.set('修改任务');
    this.dialogVisible.set(true);
  }

  private resetForm(): void {
    this.form.reset({
      jobId: undefined,
      jobName: '',
      jobGroup: 'DEFAULT',
      invokeTarget: '',
      cronExpression: '',
      misfirePolicy: '1',
      concurrent: '1',
      status: '0',
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
    const payload = this.form.getRawValue() as SysJob;
    const request$ = this.isEdit() ? this.api.updateJob(payload) : this.api.addJob(payload);
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

  /** 状态开关：后端 0 正常 1 暂停 */
  statusChange(row: SysJob, enabled: boolean): void {
    if (row.jobId === undefined) {
      return;
    }
    const status = enabled ? '0' : '1';
    const text = enabled ? '启用' : '停用';
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `确认要${text}「${row.jobName}」任务吗？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOnOk: () => {
        this.api.changeJobStatus(row.jobId as number, status).subscribe({
          next: () => {
            this.message.success(`${text}成功`);
            this.getList();
          },
        });
      },
    });
  }

  run(row: SysJob): void {
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `确认要立即执行一次「${row.jobName}」任务吗？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOnOk: () => {
        this.api.runJob(row.jobId as number, row.jobGroup ?? '').subscribe({
          next: () => this.message.success('执行成功'),
        });
      },
    });
  }

  openView(row: SysJob): void {
    this.detailRow.set(row);
    this.detailVisible.set(true);
  }

  /** 下次执行时间格式化 */
  parseTimeView(time?: string): string {
    return time ? (parseTime(time) ?? '') : '';
  }

  openJobLog(row?: SysJob): void {
    const jobId = row?.jobId ?? this.selectedRows()[0]?.jobId ?? 0;
    void this.router.navigate(['/monitor/job-log/index', jobId]);
  }

  delete(row?: SysJob): void {
    const targets = row ? [row] : this.selectedRows();
    if (!targets.length) {
      return;
    }
    const ids = targets.map((item) => item.jobId) as number[];
    const names = targets.map((item) => item.jobName).join('、');
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认删除名称为「${names}」的任务？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.api.delJob(ids).subscribe({
          next: () => {
            this.message.success('删除成功');
            this.selection.clear();
            this.getList();
          },
        });
      },
    });
  }

  export(): void {
    const query = this.buildQuery();
    const params: Record<string, unknown> = Object.fromEntries(
      Object.entries(query).filter(([key]) => key !== 'pageNum' && key !== 'pageSize'),
    );
    const filename = `job_${parseTime(new Date(), '{y}{m}{d}{h}{i}{s}')}.xlsx`;
    this.download.download('/monitor/job/export', params, filename).subscribe({
      next: () => this.message.success('导出成功'),
    });
  }
}
