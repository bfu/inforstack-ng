import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { ConfigApi } from '@api/system/config';
import { DownloadService } from '@core/download.service';
import { PageQuery } from '@core/models/result';
import { SysConfig } from '@core/models/system';
import { parseTime } from '@core/utils/ruoyi';
import { DictStore } from '@store/dict.store';
import { DictTag } from '@shared/components/dict-tag/dict-tag';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import { TableSelection } from '@shared/utils/table-selection';

/** 参数设置，对应 ruoyi-vue3/src/views/system/config/index.vue */
@Component({
  selector: 'app-config-page',
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
    NzRadioModule,
    NzSelectModule,
    NzTableModule,
  ],
  templateUrl: './config.html',
  styleUrl: './config.less',
})
export class ConfigPage implements OnInit {
  private readonly api = inject(ConfigApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly download = inject(DownloadService);
  private readonly dictStore = inject(DictStore);

  readonly searchForm = this.fb.nonNullable.group({
    configName: [''],
    configKey: [''],
    configType: [''],
  });

  dateRange: Date[] = [];

  readonly rows = signal<SysConfig[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  pageNum = 1;
  pageSize = 10;

  /** 表格多选状态 */
  readonly selection = new TableSelection<SysConfig, number>((row) => row.configId);

  readonly dialogVisible = signal(false);
  readonly dialogTitle = signal('');
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    configId: [undefined as number | undefined],
    configName: ['', [Validators.required]],
    configKey: ['', [Validators.required]],
    configValue: ['', [Validators.required]],
    configType: ['N'],
    remark: [''],
  });

  readonly isEdit = computed(() => this.form.controls.configId.value !== undefined);
  readonly yesNoOptions = computed(() => this.dictStore.getDict('sys_yes_no') ?? []);

  ngOnInit(): void {
    if (!this.dictStore.getDict('sys_yes_no')) {
      this.dictStore.loadDict('sys_yes_no').subscribe();
    }
  }

  private buildQuery(): PageQuery {
    const value = this.searchForm.getRawValue();
    const query: PageQuery = {
      pageNum: this.pageNum,
      pageSize: this.pageSize,
      configName: value.configName || undefined,
      configKey: value.configKey || undefined,
      configType: value.configType || undefined,
    };
    const range = this.dateRange?.length
      ? [parseTime(this.dateRange[0], '{y}-{m}-{d}') ?? '', parseTime(this.dateRange[1], '{y}-{m}-{d}') ?? '']
      : [];
    if (range.length) {
      query['params[beginTime]'] = range[0];
      query['params[endTime]'] = range[1];
    }
    return query;
  }

  getList(): void {
    this.loading.set(true);
    this.api.listConfig(this.buildQuery()).subscribe({
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
    this.searchForm.reset({ configName: '', configKey: '', configType: '' });
    this.dateRange = [];
    this.pageNum = 1;
    this.getList();
  }

  selectedRows(): SysConfig[] {
    return this.selection.selectedRows(this.rows());
  }

  openAdd(): void {
    this.resetForm();
    this.dialogTitle.set('添加参数');
    this.dialogVisible.set(true);
  }

  openEdit(row: SysConfig): void {
    this.resetForm();
    this.form.patchValue({
      configId: row.configId,
      configName: row.configName ?? '',
      configKey: row.configKey ?? '',
      configValue: row.configValue ?? '',
      configType: row.configType ?? 'N',
      remark: row.remark ?? '',
    });
    this.dialogTitle.set('修改参数');
    this.dialogVisible.set(true);
  }

  private resetForm(): void {
    this.form.reset({
      configId: undefined,
      configName: '',
      configKey: '',
      configValue: '',
      configType: 'N',
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
    const payload = this.form.getRawValue() as SysConfig;
    const request$ = this.isEdit() ? this.api.updateConfig(payload) : this.api.addConfig(payload);
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

  delete(row?: SysConfig): void {
    const targets = row ? [row] : this.selectedRows();
    if (!targets.length) {
      return;
    }
    const ids = targets.map((item) => item.configId) as number[];
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: '是否确认删除选中的参数数据？',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.api.delConfig(ids).subscribe({
          next: () => {
            this.message.success('删除成功');
            this.selection.clear();
            this.getList();
          },
        });
      },
    });
  }

  refreshCache(): void {
    this.api.refreshCache().subscribe({
      next: () => this.message.success('刷新缓存成功'),
    });
  }

  export(): void {
    const query = this.buildQuery();
    const params: Record<string, unknown> = Object.fromEntries(
      Object.entries(query).filter(([key]) => key !== 'pageNum' && key !== 'pageSize'),
    );
    const filename = `config_${parseTime(new Date(), '{y}{m}{d}{h}{i}{s}')}.xlsx`;
    this.download.download('/system/config/export', params, filename).subscribe({
      next: () => this.message.success('导出成功'),
    });
  }
}
