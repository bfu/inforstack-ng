import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { OperlogApi } from '@api/monitor/operlog';
import { DownloadService } from '@core/download.service';
import { PageQuery } from '@core/models/result';
import { SysOperLog } from '@core/models/monitor';
import { addDateRange, parseTime, selectDictLabel } from '@core/utils/ruoyi';
import { DictStore } from '@store/dict.store';
import { DictTag } from '@shared/components/dict-tag/dict-tag';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import { TableSelection } from '@shared/utils/table-selection';
import { environment } from '@env/environment';

/** 操作日志，对应 ruoyi-vue3/src/views/monitor/operlog/index.vue */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-operlog-page',
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
  templateUrl: './operlog.html',
  styleUrl: './operlog.less',
})
export class OperlogPage implements OnInit {
  private readonly api = inject(OperlogApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly download = inject(DownloadService);
  private readonly dictStore = inject(DictStore);

  readonly searchForm = this.fb.nonNullable.group({
    operIp: [''],
    title: [''],
    operName: [''],
    businessType: [''],
    status: [''],
  });

  readonly dateRange = signal<Date[]>([]);

  readonly rows = signal<SysOperLog[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageNum = signal(1);
  readonly pageSize = signal(environment.pageSize);

  /** 表格多选状态 */
  readonly selection = new TableSelection<SysOperLog, number>((row) => row.operId);

  readonly detailVisible = signal(false);
  readonly detailRow = signal<SysOperLog | null>(null);

  readonly operTypeOptions = computed(() => this.dictStore.getDict('sys_oper_type') ?? []);
  readonly statusOptions = computed(() => this.dictStore.getDict('sys_common_status') ?? []);
  readonly detailBusinessType = computed(() =>
    selectDictLabel(this.operTypeOptions(), this.detailRow()?.businessType),
  );

  ngOnInit(): void {
    for (const type of ['sys_oper_type', 'sys_common_status']) {
      if (!this.dictStore.getDict(type)) {
        this.dictStore.loadDict(type).subscribe();
      }
    }
    this.getList();
  }

  private dateRangeParams(): string[] {
    if (!this.dateRange()?.length) {
      return [];
    }
    // 与 vue3 的 default-time [00:00:00, 23:59:59] 保持一致
    return [
      parseTime(this.dateRange()[0], '{y}-{m}-{d} 00:00:00') ?? '',
      parseTime(this.dateRange()[1], '{y}-{m}-{d} 23:59:59') ?? '',
    ];
  }

  private buildQuery(): PageQuery {
    const value = this.searchForm.getRawValue();
    const query: PageQuery = {
      pageNum: this.pageNum(),
      pageSize: this.pageSize(),
      operIp: value.operIp || undefined,
      title: value.title || undefined,
      operName: value.operName || undefined,
      businessType: value.businessType || undefined,
      status: value.status || undefined,
    };
    return addDateRange(query, this.dateRangeParams());
  }

  getList(): void {
    this.loading.set(true);
    this.api.listOperlog(this.buildQuery()).subscribe({
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
    this.searchForm.reset({ operIp: '', title: '', operName: '', businessType: '', status: '' });
    this.dateRange.set([]);
    this.pageNum.set(1);
    this.getList();
  }

  openDetail(row: SysOperLog): void {
    this.detailRow.set(row);
    this.detailVisible.set(true);
  }

  /** 格式化请求/返回参数，解析失败时原样返回 */
  formatJson(value?: string): string {
    if (!value) {
      return '（无数据）';
    }
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }

  delete(row?: SysOperLog): void {
    const targets = row ? [row] : this.selection.selectedRows(this.rows());
    if (!targets.length) {
      return;
    }
    const ids = targets.map((item) => item.operId) as number[];
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认删除选中的 ${ids.length} 条操作日志数据？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.api.delOperlog(ids).subscribe({
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
      nzContent: '是否确认清空所有操作日志数据？',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.api.cleanOperlog().subscribe({
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
    const filename = `operlog_${parseTime(new Date(), '{y}{m}{d}{h}{i}{s}')}.xlsx`;
    this.download.download('/monitor/operlog/export', params, filename).subscribe({
      next: () => this.message.success('导出成功'),
    });
  }
}
