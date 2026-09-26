import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { PostApi } from '../../../api/system/post';
import { DownloadService } from '../../../core/download.service';
import { PageQuery } from '../../../core/models/result';
import { SysPost } from '../../../core/models/system';
import { parseTime } from '../../../core/utils/ruoyi';
import { DictStore } from '../../../store/dict.store';
import { DictTag } from '../../../shared/components/dict-tag/dict-tag';
import { HasPermiDirective } from '../../../shared/directives/has-permi.directive';
import { TableSelection } from '../../../shared/utils/table-selection';

/** 岗位管理，对应 ruoyi-vue3/src/views/system/post/index.vue */
@Component({
  selector: 'app-post-page',
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
    NzInputNumberModule,
    NzModalModule,
    NzRadioModule,
    NzSelectModule,
    NzTableModule,
  ],
  templateUrl: './post.html',
  styleUrl: './post.less',
})
export class PostPage implements OnInit {
  private readonly api = inject(PostApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly download = inject(DownloadService);
  private readonly dictStore = inject(DictStore);

  readonly searchForm = this.fb.nonNullable.group({
    postCode: [''],
    postName: [''],
    status: [''],
  });

  readonly rows = signal<SysPost[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  pageNum = 1;
  pageSize = 10;

  /** 表格多选状态 */
  readonly selection = new TableSelection<SysPost, number>((row) => row.postId);

  readonly dialogVisible = signal(false);
  readonly dialogTitle = signal('');
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    postId: [undefined as number | undefined],
    postName: ['', [Validators.required]],
    postCode: ['', [Validators.required]],
    postSort: [0, [Validators.required]],
    status: ['0'],
    remark: [''],
  });

  readonly isEdit = computed(() => this.form.controls.postId.value !== undefined);
  readonly statusOptions = computed(() => this.dictStore.getDict('sys_normal_disable') ?? []);

  ngOnInit(): void {
    if (!this.dictStore.getDict('sys_normal_disable')) {
      this.dictStore.loadDict('sys_normal_disable').subscribe();
    }
  }

  private buildQuery(): PageQuery {
    const value = this.searchForm.getRawValue();
    return {
      pageNum: this.pageNum,
      pageSize: this.pageSize,
      postCode: value.postCode || undefined,
      postName: value.postName || undefined,
      status: value.status || undefined,
    };
  }

  getList(): void {
    this.loading.set(true);
    this.api.listPost(this.buildQuery()).subscribe({
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
    this.searchForm.reset({ postCode: '', postName: '', status: '' });
    this.pageNum = 1;
    this.getList();
  }

  selectedRows(): SysPost[] {
    return this.selection.selectedRows(this.rows());
  }

  openAdd(): void {
    this.resetForm();
    this.dialogTitle.set('添加岗位');
    this.dialogVisible.set(true);
  }

  openEdit(row: SysPost): void {
    this.resetForm();
    this.form.patchValue({
      postId: row.postId,
      postName: row.postName ?? '',
      postCode: row.postCode ?? '',
      postSort: row.postSort ?? 0,
      status: row.status ?? '0',
      remark: row.remark ?? '',
    });
    this.dialogTitle.set('修改岗位');
    this.dialogVisible.set(true);
  }

  private resetForm(): void {
    this.form.reset({
      postId: undefined,
      postName: '',
      postCode: '',
      postSort: 0,
      status: '0',
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
    const payload = this.form.getRawValue() as SysPost;
    const request$ = this.isEdit() ? this.api.updatePost(payload) : this.api.addPost(payload);
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

  delete(row?: SysPost): void {
    const targets = row ? [row] : this.selectedRows();
    if (!targets.length) {
      return;
    }
    const ids = targets.map((item) => item.postId) as number[];
    const names = targets.map((item) => item.postName).join('、');
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认删除岗位名称为「${names}」的数据项？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.api.delPost(ids).subscribe({
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
    const filename = `post_${parseTime(new Date(), '{y}{m}{d}{h}{i}{s}')}.xlsx`;
    this.download.download('/system/post/export', params, filename).subscribe({
      next: () => this.message.success('导出成功'),
    });
  }
}
