import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { GenApi } from '../../../api/tool/gen';
import { DownloadService } from '../../../core/download.service';
import { PageQuery } from '../../../core/models/result';
import { DEFAULT_TPL_WEB_TYPE, GenPreview, GenTable } from '../../../core/models/tool';
import { addDateRange, parseTime } from '../../../core/utils/ruoyi';
import {
  HasPermiDirective,
  HasRoleDirective,
} from '../../../shared/directives/has-permi.directive';
import { TableSelection } from '../../../shared/utils/table-selection';

interface PreviewFile {
  /** 文件名，如 domain.java */
  name: string;
  code: string;
}

/**
 * 代码生成列表，对应 ruoyi-vue3/src/views/tool/gen/index.vue
 * 导入表 / 创建表 / 代码预览三个弹窗以页面内 nz-modal 方式实现，与其余列表页保持一致
 */
@Component({
  selector: 'app-gen-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    HasPermiDirective,
    HasRoleDirective,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzDatePickerModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSpinModule,
    NzTableModule,
    NzTabsModule,
  ],
  templateUrl: './gen.html',
  styleUrl: './gen.less',
})
export class GenPage implements OnInit {
  private readonly api = inject(GenApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly download = inject(DownloadService);
  private readonly router = inject(Router);

  readonly searchForm = this.fb.nonNullable.group({
    tableName: [''],
    tableComment: [''],
  });

  dateRange: Date[] = [];

  readonly rows = signal<GenTable[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  pageNum = 1;
  pageSize = 10;
  orderByColumn = 'createTime';
  isAsc = 'descending';

  /** 表格多选状态 */
  readonly selection = new TableSelection<GenTable, number>((row) => row.tableId);

  // 导入表弹窗
  readonly importVisible = signal(false);
  readonly importSubmitting = signal(false);
  readonly importLoading = signal(false);
  readonly importRows = signal<GenTable[]>([]);
  readonly importTotal = signal(0);
  readonly importSelection = new TableSelection<GenTable, string>((row) => row.tableName);
  importPageNum = 1;
  importPageSize = 10;

  readonly importSearchForm = this.fb.nonNullable.group({
    tableName: [''],
    tableComment: [''],
  });

  // 创建表弹窗
  readonly createVisible = signal(false);
  readonly createSubmitting = signal(false);
  createContent = '';

  // 代码预览弹窗
  readonly previewVisible = signal(false);
  readonly previewLoading = signal(false);
  readonly previewFiles = signal<PreviewFile[]>([]);
  readonly previewActiveIndex = signal(0);
  /** 请求序号，用于丢弃过期响应（避免重复快速打开时旧结果覆盖新结果） */
  private previewSeq = 0;

  ngOnInit(): void {
    this.getList();
  }

  private buildQuery(): PageQuery {
    const value = this.searchForm.getRawValue();
    const query: PageQuery = {
      pageNum: this.pageNum,
      pageSize: this.pageSize,
      orderByColumn: this.orderByColumn,
      isAsc: this.isAsc,
      tableName: value.tableName || undefined,
      tableComment: value.tableComment || undefined,
    };
    const range = this.dateRange?.length
      ? [
          parseTime(this.dateRange[0], '{y}-{m}-{d}') ?? '',
          parseTime(this.dateRange[1], '{y}-{m}-{d}') ?? '',
        ]
      : [];
    return addDateRange(query, range);
  }

  getList(): void {
    this.loading.set(true);
    this.api.listTable(this.buildQuery()).subscribe({
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
    // 服务端排序：后端 PageDomain 会将 ascending/descending 归一化为 asc/desc
    const sort = params.sort?.find((item) => item.value !== null);
    this.orderByColumn = sort?.key ?? 'createTime';
    this.isAsc = sort?.value === 'ascend' ? 'ascending' : 'descending';
    this.getList();
  }

  resetQuery(): void {
    this.searchForm.reset({ tableName: '', tableComment: '' });
    this.dateRange = [];
    this.pageNum = 1;
    this.getList();
  }

  /** 跳转修改生成配置页，携带当前页码以便返回时还原 */
  handleEditTable(row?: GenTable): void {
    const tableId = row?.tableId ?? this.selectedRows()[0]?.tableId;
    if (tableId === undefined) {
      return;
    }
    void this.router.navigate(['/tool/gen-edit/index', tableId], {
      queryParams: { pageNum: this.pageNum },
    });
  }

  /** 当前页选中行 */
  selectedRows(): GenTable[] {
    return this.selection.selectedRows(this.rows());
  }

  /** 生成代码：单行走自定义路径或单表 zip，工具栏批量走 ruoyi.zip */
  handleGenTable(row?: GenTable): void {
    const tbNames =
      row?.tableName ||
      this.selectedRows()
        .map((item) => item.tableName)
        .join(',');
    if (tbNames === '') {
      this.message.error('请选择要生成的数据');
      return;
    }
    if (row?.genType === '1') {
      this.api.genCode(row.tableName ?? '').subscribe({
        next: () => this.message.success('成功生成到自定义路径：' + row.genPath),
      });
      return;
    }
    const zipName = row ? `${tbNames}.zip` : 'ruoyi.zip';
    this.download.zip(`/tool/gen/batchGenCode?tables=${encodeURIComponent(tbNames)}`, zipName);
  }

  handleSynchDb(row: GenTable): void {
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `确认要强制同步"${row.tableName}"表结构吗？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOnOk: () => {
        this.api.synchDb(row.tableName ?? '').subscribe({
          next: () => this.message.success('同步成功'),
        });
      },
    });
  }

  handleDelete(row?: GenTable): void {
    const targets = row ? [row] : this.selectedRows();
    if (!targets.length) {
      return;
    }
    const tableIds = targets.map((item) => item.tableId) as number[];
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认删除表编号为"${tableIds.join(',')}"的数据项？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.api.delTable(tableIds).subscribe({
          next: () => {
            this.message.success('删除成功');
            this.selection.clear();
            this.getList();
          },
        });
      },
    });
  }

  // ---------- 导入表弹窗 ----------

  openImportTable(): void {
    this.importPageNum = 1;
    this.importSelection.clear();
    this.importVisible.set(true);
    this.getImportList();
  }

  private buildImportQuery(): PageQuery {
    const value = this.importSearchForm.getRawValue();
    return {
      pageNum: this.importPageNum,
      pageSize: this.importPageSize,
      tableName: value.tableName || undefined,
      tableComment: value.tableComment || undefined,
    };
  }

  getImportList(): void {
    this.importLoading.set(true);
    this.api.listDbTable(this.buildImportQuery()).subscribe({
      next: (res) => {
        this.importRows.set(res.rows ?? []);
        this.importTotal.set(res.total ?? 0);
        this.importLoading.set(false);
        this.importSelection.refresh(this.importRows());
      },
      error: () => this.importLoading.set(false),
    });
  }

  onImportQueryParams(params: NzTableQueryParams): void {
    this.importPageNum = params.pageIndex;
    this.importPageSize = params.pageSize;
    this.getImportList();
  }

  searchImport(): void {
    this.importPageNum = 1;
    this.getImportList();
  }

  resetImportQuery(): void {
    this.importSearchForm.reset({ tableName: '', tableComment: '' });
    this.searchImport();
  }

  /** 行点击切换勾选，等同 ruoyi-vue3 的 clickRow */
  toggleImportRow(row: GenTable): void {
    this.importSelection.toggle(row, this.importRows());
  }

  submitImport(): void {
    const tables = this.importSelection.selectedKeys().join(',');
    if (!tables) {
      this.message.error('请选择要导入的表');
      return;
    }
    this.importSubmitting.set(true);
    this.api.importTable({ tables, tplWebType: DEFAULT_TPL_WEB_TYPE }).subscribe({
      next: (res) => {
        this.importSubmitting.set(false);
        this.message.success(res.msg);
        if (res.code === 200) {
          this.closeImport();
          this.pageNum = 1;
          this.getList();
        }
      },
      error: () => this.importSubmitting.set(false),
    });
  }

  /** 关闭并清空勾选，避免下次打开残留上一次的选中项 */
  closeImport(): void {
    this.importVisible.set(false);
    this.importSubmitting.set(false);
    this.importSelection.clear();
  }

  onImportVisibleChange(visible: boolean): void {
    if (visible) {
      this.importVisible.set(true);
    } else {
      this.closeImport();
    }
  }

  // ---------- 创建表弹窗 ----------

  openCreateTable(): void {
    this.createContent = '';
    this.createVisible.set(true);
  }

  submitCreate(): void {
    if (!this.createContent.trim()) {
      this.message.error('请输入建表语句');
      return;
    }
    this.createSubmitting.set(true);
    this.api.createTable({ sql: this.createContent, tplWebType: DEFAULT_TPL_WEB_TYPE }).subscribe({
      next: (res) => {
        this.createSubmitting.set(false);
        this.message.success(res.msg);
        if (res.code === 200) {
          this.closeCreate();
          this.pageNum = 1;
          this.getList();
        }
      },
      error: () => this.createSubmitting.set(false),
    });
  }

  closeCreate(): void {
    this.createVisible.set(false);
    this.createSubmitting.set(false);
    this.createContent = '';
  }

  onCreateVisibleChange(visible: boolean): void {
    if (visible) {
      this.createVisible.set(true);
    } else {
      this.closeCreate();
    }
  }

  // ---------- 代码预览弹窗 ----------

  handlePreview(row: GenTable): void {
    if (row.tableId === undefined) {
      return;
    }
    const seq = ++this.previewSeq;
    this.previewVisible.set(true);
    this.previewLoading.set(true);
    this.previewFiles.set([]);
    this.previewActiveIndex.set(0);
    this.api.previewTable(row.tableId).subscribe({
      next: (res) => {
        if (seq !== this.previewSeq) {
          return;
        }
        const files = this.toPreviewFiles(res.data ?? {});
        this.previewFiles.set(files);
        const domainIndex = files.findIndex((file) => file.name === 'domain.java');
        this.previewActiveIndex.set(domainIndex >= 0 ? domainIndex : 0);
        this.previewLoading.set(false);
      },
      error: () => {
        if (seq !== this.previewSeq) {
          return;
        }
        this.previewLoading.set(false);
      },
    });
  }

  /** 关闭并作废旧请求 */
  closePreview(): void {
    this.previewSeq++;
    this.previewVisible.set(false);
    this.previewLoading.set(false);
    this.previewFiles.set([]);
    this.previewActiveIndex.set(0);
  }

  onPreviewVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closePreview();
    }
  }

  private toPreviewFiles(data: GenPreview): PreviewFile[] {
    return Object.entries(data).map(([key, value]) => ({
      name: this.previewFileName(key),
      code: value ?? '',
    }));
  }

  /** 模板路径 → 文件名，与 ruoyi-vue3 一致：取最后一个 / 到 .vm 之间 */
  private previewFileName(key: string): string {
    const start = key.lastIndexOf('/') + 1;
    const end = key.indexOf('.vm');
    return end > start ? key.substring(start, end) : key.substring(start);
  }

  async copy(code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      this.message.success('复制成功');
    } catch {
      this.copyFallback(code);
    }
  }

  /** 非安全上下文下 clipboard API 不可用，退回到 execCommand */
  private copyFallback(code: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = code;
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
