import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { JobApi } from '../../../api/monitor/job';
import { JobLogApi } from '../../../api/monitor/job-log';
import { DownloadService } from '../../../core/download.service';
import { PageQuery } from '../../../core/models/result';
import { SysJobLog } from '../../../core/models/monitor';
import { addDateRange, parseTime } from '../../../core/utils/ruoyi';
import { DictStore } from '../../../store/dict.store';
import { DictTag } from '../../../shared/components/dict-tag/dict-tag';
import { HasPermiDirective } from '../../../shared/directives/has-permi.directive';
import { TableSelection } from '../../../shared/utils/table-selection';

/**
 * 定时任务调度日志，对应 ruoyi-vue3/src/views/monitor/job/log.vue
 * 该页为隐藏路由（后端无菜单），由定时任务页跳转并携带 jobId
 */
@Component({
  selector: 'app-job-log-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DictTag,
    HasPermiDirective,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzDatePickerModule,
    NzDescriptionsModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
  ],
  templateUrl: './job-log.html',
  styleUrl: './job-log.less',
})
export class JobLogPage implements OnInit {
  private readonly api = inject(JobLogApi);
  private readonly jobApi = inject(JobApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly download = inject(DownloadService);
  private readonly dictStore = inject(DictStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly searchForm = this.fb.nonNullable.group({
    jobName: [''],
    jobGroup: [''],
    status: [''],
  });

  dateRange: Date[] = [];

  readonly rows = signal<SysJobLog[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  pageNum = 1;
  pageSize = 10;

  /** 表格多选状态 */
  readonly selection = new TableSelection<SysJobLog, number>((row) => row.jobLogId);

  readonly detailVisible = signal(false);
  readonly detailRow = signal<SysJobLog | null>(null);

  readonly jobGroupOptions = computed(() => this.dictStore.getDict('sys_job_group') ?? []);
  readonly statusOptions = computed(() => this.dictStore.getDict('sys_common_status') ?? []);
  /** 执行耗时(毫秒)，由开始/结束时间计算 */
  readonly detailCostTime = computed(() => {
    const row = this.detailRow();
    if (!row?.startTime || !row.endTime) {
      return '';
    }
    const cost = new Date(row.endTime.replace(/-/g, '/')).getTime() - new Date(row.startTime.replace(/-/g, '/')).getTime();
    return Number.isNaN(cost) ? '' : `${cost} 毫秒`;
  });

  private jobId = 0;

  ngOnInit(): void {
    for (const type of ['sys_job_group', 'sys_common_status']) {
      if (!this.dictStore.getDict(type)) {
        this.dictStore.loadDict(type).subscribe();
      }
    }
    const jobId = Number(this.route.snapshot.paramMap.get('jobId') ?? 0);
    this.jobId = Number.isNaN(jobId) ? 0 : jobId;
    if (this.jobId) {
      // 由任务明细进入时，先回填任务名称与分组
      this.jobApi.getJob(this.jobId).subscribe({
        next: (res) => {
          this.searchForm.patchValue({
            jobName: res.data?.jobName ?? '',
            jobGroup: res.data?.jobGroup ?? '',
          });
          this.getList();
        },
        error: () => this.getList(),
      });
      return;
    }
    this.getList();
  }

  private dateRangeParams(): string[] {
    if (!this.dateRange?.length) {
      return [];
    }
    // 与 vue3 保持一致：调度日志按日期查询
    return [
      parseTime(this.dateRange[0], '{y}-{m}-{d}') ?? '',
      parseTime(this.dateRange[1], '{y}-{m}-{d}') ?? '',
    ];
  }

  private buildQuery(): PageQuery {
    const value = this.searchForm.getRawValue();
    const query: PageQuery = {
      pageNum: this.pageNum,
      pageSize: this.pageSize,
      jobName: value.jobName || undefined,
      jobGroup: value.jobGroup || undefined,
      status: value.status || undefined,
    };
    return addDateRange(query, this.dateRangeParams());
  }

  getList(): void {
    this.loading.set(true);
    this.api.listJobLog(this.buildQuery()).subscribe({
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
    this.pageNum = params.pageIndex;
    this.pageSize = params.pageSize;
    this.getList();
  }

  resetQuery(): void {
    this.searchForm.reset({ jobName: '', jobGroup: '', status: '' });
    this.dateRange = [];
    this.pageNum = 1;
    this.getList();
  }

  openDetail(row: SysJobLog): void {
    this.detailRow.set(row);
    this.detailVisible.set(true);
  }

  delete(): void {
    const ids = this.selection.selectedKeys();
    if (!ids.length) {
      return;
    }
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认删除选中的 ${ids.length} 条调度日志数据？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.api.delJobLog(ids).subscribe({
          next: () => {
            this.message.success('删除成功');
            this.selection.clear();
            this.getList();
          },
        });
      },
    });
  }

  clean(): void {
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: '是否确认清空所有调度日志数据？',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.api.cleanJobLog().subscribe({
          next: () => {
            this.message.success('清空成功');
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
    const filename = `job_log_${parseTime(new Date(), '{y}{m}{d}{h}{i}{s}')}.xlsx`;
    this.download.download('/monitor/jobLog/export', params, filename).subscribe({
      next: () => this.message.success('导出成功'),
    });
  }

  close(): void {
    void this.router.navigate(['/monitor/job']);
  }
}
