import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NoticeApi } from '@api/system/notice';
import { DownloadService } from '@core/download.service';
import { PageQuery } from '@core/models/result';
import { SysNotice } from '@core/models/system';
import { parseTime } from '@core/utils/ruoyi';
import { DictStore } from '@store/dict.store';
import { DictTag } from '@shared/components/dict-tag/dict-tag';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import { TableSelection } from '@shared/utils/table-selection';
import { environment } from '@env/environment';

/** 通知公告，对应 ruoyi-vue3/src/views/system/notice/index.vue */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-notice-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DictTag,
    HasPermiDirective,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzRadioModule,
    NzSelectModule,
    NzTableModule,
  ],
  templateUrl: './notice.html',
  styleUrl: './notice.less',
})
export class NoticePage implements OnInit {
  private readonly api = inject(NoticeApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly download = inject(DownloadService);
  private readonly dictStore = inject(DictStore);

  readonly searchForm = this.fb.nonNullable.group({
    noticeTitle: [''],
    createBy: [''],
    noticeType: [''],
  });

  readonly rows = signal<SysNotice[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageNum = signal(1);
  readonly pageSize = signal(environment.pageSize);

  /** 表格多选状态 */
  readonly selection = new TableSelection<SysNotice, number>((row) => row.noticeId);

  readonly dialogVisible = signal(false);
  readonly dialogTitle = signal('');
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    noticeId: [undefined as number | undefined],
    noticeTitle: ['', [Validators.required]],
    noticeType: ['1', [Validators.required]],
    status: ['0'],
    noticeContent: [''],
  });

  readonly isEdit = computed(() => this.form.controls.noticeId.value != null);
  readonly noticeTypeOptions = computed(() => this.dictStore.getDict('sys_notice_type') ?? []);
  readonly statusOptions = computed(() => this.dictStore.getDict('sys_notice_status') ?? []);

  ngOnInit(): void {
    for (const type of ['sys_notice_type', 'sys_notice_status']) {
      if (!this.dictStore.getDict(type)) {
        this.dictStore.loadDict(type).subscribe();
      }
    }
    // nz-table 的 (nzQueryParams) 带 skip(1)，首次进入不会触发，需显式发起首查
    this.getList();
  }

  private buildQuery(): PageQuery {
    const value = this.searchForm.getRawValue();
    return {
      pageNum: this.pageNum(),
      pageSize: this.pageSize(),
      noticeTitle: value.noticeTitle || undefined,
      createBy: value.createBy || undefined,
      noticeType: value.noticeType || undefined,
    };
  }

  getList(): void {
    this.loading.set(true);
    this.api.listNotice(this.buildQuery()).subscribe({
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
    this.searchForm.reset({ noticeTitle: '', createBy: '', noticeType: '' });
    this.pageNum.set(1);
    this.getList();
  }

  selectedRows(): SysNotice[] {
    return this.selection.selectedRows(this.rows());
  }

  openAdd(): void {
    this.resetForm();
    this.dialogTitle.set('添加公告');
    this.dialogVisible.set(true);
  }

  openEdit(row: SysNotice): void {
    this.resetForm();
    this.form.patchValue({
      noticeId: row.noticeId,
      noticeTitle: row.noticeTitle ?? '',
      noticeType: row.noticeType ?? '1',
      status: row.status ?? '0',
      noticeContent: row.noticeContent ?? '',
    });
    this.dialogTitle.set('修改公告');
    this.dialogVisible.set(true);
  }

  private resetForm(): void {
    this.form.reset({
      noticeId: undefined,
      noticeTitle: '',
      noticeType: '1',
      status: '0',
      noticeContent: '',
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
    const payload = this.form.getRawValue() as SysNotice;
    const request$ = this.isEdit() ? this.api.updateNotice(payload) : this.api.addNotice(payload);
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

  delete(row?: SysNotice): void {
    const targets = row ? [row] : this.selectedRows();
    if (!targets.length) {
      return;
    }
    const ids = targets.map((item) => item.noticeId) as number[];
    const titles = targets.map((item) => item.noticeTitle).join('、');
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认删除标题为「${titles}」的公告？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.api.delNotice(ids).subscribe({
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
    const filename = `notice_${parseTime(new Date(), '{y}{m}{d}{h}{i}{s}')}.xlsx`;
    this.download.download('/system/notice/export', params, filename).subscribe({
      next: () => this.message.success('导出成功'),
    });
  }
}
