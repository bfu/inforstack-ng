import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { LogininforApi } from '@api/monitor/logininfor';
import { DownloadService } from '@core/download.service';
import { PageQuery } from '@core/models/result';
import { SysLogininfor } from '@core/models/monitor';
import { addDateRange, parseTime } from '@core/utils/ruoyi';
import { DictStore } from '@store/dict.store';
import { DictTag } from '@shared/components/dict-tag/dict-tag';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import { TableSelection } from '@shared/utils/table-selection';

/** 登录日志，对应 ruoyi-vue3/src/views/monitor/logininfor/index.vue */
@Component({
  selector: 'app-logininfor-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DictTag,
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
    NzSelectModule,
    NzTableModule,
  ],
  templateUrl: './logininfor.html',
  styleUrl: './logininfor.less',
})
export class LogininforPage implements OnInit {
  private readonly api = inject(LogininforApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly download = inject(DownloadService);
  private readonly dictStore = inject(DictStore);

  readonly searchForm = this.fb.nonNullable.group({
    ipaddr: [''],
    userName: [''],
    status: [''],
  });

  dateRange: Date[] = [];

  readonly rows = signal<SysLogininfor[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  pageNum = 1;
  pageSize = 10;

  /** 表格多选状态 */
  readonly selection = new TableSelection<SysLogininfor, number>((row) => row.infoId);
  readonly statusOptions = computed(() => this.dictStore.getDict('sys_common_status') ?? []);
  /** 选中行的登录名，用于解锁 */
  readonly selectedUserName = computed(
    () => this.rows().find((row) => this.selection.isChecked(row))?.userName ?? '',
  );

  ngOnInit(): void {
    if (!this.dictStore.getDict('sys_common_status')) {
      this.dictStore.loadDict('sys_common_status').subscribe();
    }
    this.getList();
  }

  private dateRangeParams(): string[] {
    if (!this.dateRange?.length) {
      return [];
    }
    // 与 vue3 的 default-time [00:00:00, 23:59:59] 保持一致
    return [
      parseTime(this.dateRange[0], '{y}-{m}-{d} 00:00:00') ?? '',
      parseTime(this.dateRange[1], '{y}-{m}-{d} 23:59:59') ?? '',
    ];
  }

  private buildQuery(): PageQuery {
    const value = this.searchForm.getRawValue();
    const query: PageQuery = {
      pageNum: this.pageNum,
      pageSize: this.pageSize,
      ipaddr: value.ipaddr || undefined,
      userName: value.userName || undefined,
      status: value.status || undefined,
    };
    return addDateRange(query, this.dateRangeParams());
  }

  getList(): void {
    this.loading.set(true);
    this.api.listLogininfor(this.buildQuery()).subscribe({
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
    this.searchForm.reset({ ipaddr: '', userName: '', status: '' });
    this.dateRange = [];
    this.pageNum = 1;
    this.getList();
  }

  delete(row?: SysLogininfor): void {
    const targets = row ? [row] : this.selection.selectedRows(this.rows());
    if (!targets.length) {
      return;
    }
    const ids = targets.map((item) => item.infoId) as number[];
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认删除选中的 ${ids.length} 条登录日志数据？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.api.delLogininfor(ids).subscribe({
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
      nzContent: '是否确认清空所有登录日志数据？',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.api.cleanLogininfor().subscribe({
          next: () => {
            this.message.success('清空成功');
            this.selection.clear();
            this.getList();
          },
        });
      },
    });
  }

  unlock(): void {
    const userName = this.selectedUserName();
    if (!userName) {
      return;
    }
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认解锁用户「${userName}」的登录状态？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOnOk: () => {
        this.api.unlockLogininfor(userName).subscribe({
          next: () => {
            this.message.success(`用户 ${userName} 解锁成功`);
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
    const filename = `logininfor_${parseTime(new Date(), '{y}{m}{d}{h}{i}{s}')}.xlsx`;
    this.download.download('/monitor/logininfor/export', params, filename).subscribe({
      next: () => this.message.success('导出成功'),
    });
  }
}
