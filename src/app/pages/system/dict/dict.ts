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
import { DictDataApi } from '@api/system/dict/data';
import { DictTypeApi } from '@api/system/dict/type';
import { DownloadService } from '@core/download.service';
import { PageQuery } from '@core/models/result';
import { SysDictData, SysDictType } from '@core/models/system';
import { parseTime } from '@core/utils/ruoyi';
import { DictStore } from '@store/dict.store';
import { DictTag } from '@shared/components/dict-tag/dict-tag';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';

/** 字典数据回显样式选项（对应后端 listClass） */
const LIST_CLASS_OPTIONS = [
  { value: 'default', label: '默认 default' },
  { value: 'primary', label: '主要 primary' },
  { value: 'success', label: '成功 success' },
  { value: 'info', label: '信息 info' },
  { value: 'warning', label: '警告 warning' },
  { value: 'danger', label: '危险 danger' },
];

/** 字典管理，对应 ruoyi-vue3/src/views/system/dict/index.vue */
@Component({
  selector: 'app-dict-page',
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
  templateUrl: './dict.html',
  styleUrl: './dict.less',
})
export class DictPage implements OnInit {
  private readonly typeApi = inject(DictTypeApi);
  private readonly dataApi = inject(DictDataApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly download = inject(DownloadService);
  private readonly dictStore = inject(DictStore);

  readonly listClassOptions = LIST_CLASS_OPTIONS;

  // 字典类型
  readonly typeSearch = this.fb.nonNullable.group({ dictName: [''], dictType: [''], status: [''] });
  readonly types = signal<SysDictType[]>([]);
  readonly typeTotal = signal(0);
  readonly typeLoading = signal(false);
  typePageNum = 1;
  typePageSize = 10;
  readonly typeChecked = signal<Set<number>>(new Set());
  readonly currentType = signal<string>('');

  // 字典数据
  readonly dataSearch = this.fb.nonNullable.group({ dictLabel: [''], status: [''] });
  readonly datas = signal<SysDictData[]>([]);
  readonly dataTotal = signal(0);
  readonly dataLoading = signal(false);
  dataPageNum = 1;
  dataPageSize = 10;
  readonly dataChecked = signal<Set<number>>(new Set());

  // 弹窗
  readonly typeDialog = signal(false);
  readonly typeTitle = signal('');
  readonly dataDialog = signal(false);
  readonly dataTitle = signal('');
  readonly submitting = signal(false);

  readonly typeForm = this.fb.group({
    dictId: [undefined as number | undefined],
    dictName: ['', [Validators.required]],
    dictType: ['', [Validators.required]],
    status: ['0'],
    remark: [''],
  });

  readonly dataForm = this.fb.group({
    dictCode: [undefined as number | undefined],
    dictLabel: ['', [Validators.required]],
    dictValue: ['', [Validators.required]],
    dictSort: [0, [Validators.required]],
    listClass: ['default'],
    isDefault: ['N'],
    status: ['0'],
    remark: [''],
  });

  readonly typeEdit = computed(() => this.typeForm.controls.dictId.value !== undefined);
  readonly dataEdit = computed(() => this.dataForm.controls.dictCode.value !== undefined);
  readonly typeSingle = computed(() => this.typeChecked().size === 1);
  readonly typeMultiple = computed(() => this.typeChecked().size > 0);
  readonly dataSingle = computed(() => this.dataChecked().size === 1);
  readonly dataMultiple = computed(() => this.dataChecked().size > 0);
  readonly statusOptions = computed(() => this.dictStore.getDict('sys_normal_disable') ?? []);
  readonly yesNoOptions = computed(() => this.dictStore.getDict('sys_yes_no') ?? []);
  readonly dataCardTitle = computed(() =>
    this.currentType() ? `字典数据 - ${this.currentType()}` : '字典数据',
  );

  ngOnInit(): void {
    for (const type of ['sys_normal_disable', 'sys_yes_no']) {
      if (!this.dictStore.getDict(type)) {
        this.dictStore.loadDict(type).subscribe();
      }
    }
  }

  // ---------- 字典类型 ----------

  private typeQuery(): PageQuery {
    const value = this.typeSearch.getRawValue();
    return {
      pageNum: this.typePageNum,
      pageSize: this.typePageSize,
      dictName: value.dictName || undefined,
      dictType: value.dictType || undefined,
      status: value.status || undefined,
    };
  }

  getTypeList(): void {
    this.typeLoading.set(true);
    this.typeApi.listType(this.typeQuery()).subscribe({
      next: (res) => {
        this.types.set(res.rows ?? []);
        this.typeTotal.set(res.total ?? 0);
        this.typeLoading.set(false);
      },
      error: () => this.typeLoading.set(false),
    });
  }

  onTypeParams(params: NzTableQueryParams): void {
    this.typePageNum = params.pageIndex;
    this.typePageSize = params.pageSize;
    this.getTypeList();
  }

  resetTypeQuery(): void {
    this.typeSearch.reset({ dictName: '', dictType: '', status: '' });
    this.typePageNum = 1;
    this.getTypeList();
  }

  onTypeChecked(dictId: number | undefined, checked: boolean): void {
    if (dictId === undefined) {
      return;
    }
    const ids = new Set(this.typeChecked());
    if (checked) {
      ids.add(dictId);
    } else {
      ids.delete(dictId);
    }
    this.typeChecked.set(ids);
  }

  typeRows(): SysDictType[] {
    return this.types().filter((row) => row.dictId !== undefined && this.typeChecked().has(row.dictId));
  }

  /** 选中某一行字典类型，加载其字典数据 */
  selectType(row: SysDictType): void {
    this.currentType.set(row.dictType ?? '');
    this.dataChecked.set(new Set());
    this.dataPageNum = 1;
    this.getDataList();
  }

  openTypeAdd(): void {
    this.typeForm.reset({ dictId: undefined, dictName: '', dictType: '', status: '0', remark: '' });
    this.typeTitle.set('添加字典类型');
    this.typeDialog.set(true);
  }

  openTypeEdit(row: SysDictType): void {
    this.typeForm.reset({ dictId: undefined, dictName: '', dictType: '', status: '0', remark: '' });
    this.typeForm.patchValue({
      dictId: row.dictId,
      dictName: row.dictName ?? '',
      dictType: row.dictType ?? '',
      status: row.status ?? '0',
      remark: row.remark ?? '',
    });
    this.typeTitle.set('修改字典类型');
    this.typeDialog.set(true);
  }

  submitType(): void {
    if (this.typeForm.invalid) {
      Object.values(this.typeForm.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }
    this.submitting.set(true);
    const payload = this.typeForm.getRawValue() as SysDictType;
    const request$ = this.typeEdit() ? this.typeApi.updateType(payload) : this.typeApi.addType(payload);
    request$.subscribe({
      next: () => {
        this.message.success(this.typeEdit() ? '修改成功' : '新增成功');
        this.submitting.set(false);
        this.typeDialog.set(false);
        this.getTypeList();
      },
      error: () => this.submitting.set(false),
    });
  }

  deleteType(row?: SysDictType): void {
    const targets = row ? [row] : this.typeRows();
    if (!targets.length) {
      return;
    }
    const ids = targets.map((item) => item.dictId) as number[];
    const names = targets.map((item) => item.dictName).join('、');
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认删除字典名称为「${names}」的数据项？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.typeApi.delType(ids).subscribe({
          next: () => {
            this.message.success('删除成功');
            this.typeChecked.set(new Set());
            this.getTypeList();
            this.dictStore.cleanDict();
          },
        });
      },
    });
  }

  refreshCache(): void {
    this.typeApi.refreshCache().subscribe({
      next: () => {
        this.message.success('刷新缓存成功');
        this.dictStore.cleanDict();
      },
    });
  }

  exportType(): void {
    const query = this.typeQuery();
    const params: Record<string, unknown> = Object.fromEntries(
      Object.entries(query).filter(([key]) => key !== 'pageNum' && key !== 'pageSize'),
    );
    const filename = `dict_type_${parseTime(new Date(), '{y}{m}{d}{h}{i}{s}')}.xlsx`;
    this.download.download('/system/dict/type/export', params, filename).subscribe({
      next: () => this.message.success('导出成功'),
    });
  }

  // ---------- 字典数据 ----------

  private dataQuery(): PageQuery {
    const value = this.dataSearch.getRawValue();
    return {
      pageNum: this.dataPageNum,
      pageSize: this.dataPageSize,
      dictType: this.currentType() || undefined,
      dictLabel: value.dictLabel || undefined,
      status: value.status || undefined,
    };
  }

  getDataList(): void {
    if (!this.currentType()) {
      return;
    }
    this.dataLoading.set(true);
    this.dataApi.listData(this.dataQuery()).subscribe({
      next: (res) => {
        this.datas.set(res.rows ?? []);
        this.dataTotal.set(res.total ?? 0);
        this.dataLoading.set(false);
      },
      error: () => this.dataLoading.set(false),
    });
  }

  onDataParams(params: NzTableQueryParams): void {
    this.dataPageNum = params.pageIndex;
    this.dataPageSize = params.pageSize;
    this.getDataList();
  }

  resetDataQuery(): void {
    this.dataSearch.reset({ dictLabel: '', status: '' });
    this.dataPageNum = 1;
    this.getDataList();
  }

  onDataChecked(dictCode: number | undefined, checked: boolean): void {
    if (dictCode === undefined) {
      return;
    }
    const ids = new Set(this.dataChecked());
    if (checked) {
      ids.add(dictCode);
    } else {
      ids.delete(dictCode);
    }
    this.dataChecked.set(ids);
  }

  dataRows(): SysDictData[] {
    return this.datas().filter((row) => row.dictCode !== undefined && this.dataChecked().has(row.dictCode));
  }

  openDataAdd(): void {
    if (!this.currentType()) {
      this.message.warning('请先在左侧选择一个字典类型');
      return;
    }
    this.dataForm.reset({
      dictCode: undefined,
      dictLabel: '',
      dictValue: '',
      dictSort: 0,
      listClass: 'default',
      isDefault: 'N',
      status: '0',
      remark: '',
    });
    this.dataTitle.set('添加字典数据');
    this.dataDialog.set(true);
  }

  openDataEdit(row: SysDictData): void {
    this.dataForm.reset({
      dictCode: undefined,
      dictLabel: '',
      dictValue: '',
      dictSort: 0,
      listClass: 'default',
      isDefault: 'N',
      status: '0',
      remark: '',
    });
    this.dataForm.patchValue({
      dictCode: row.dictCode,
      dictLabel: row.dictLabel ?? '',
      dictValue: row.dictValue ?? '',
      dictSort: row.dictSort ?? 0,
      listClass: row.listClass ?? 'default',
      isDefault: row.isDefault ?? 'N',
      status: row.status ?? '0',
      remark: row.remark ?? '',
    });
    this.dataTitle.set('修改字典数据');
    this.dataDialog.set(true);
  }

  submitData(): void {
    if (this.dataForm.invalid) {
      Object.values(this.dataForm.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }
    this.submitting.set(true);
    const payload = { ...(this.dataForm.getRawValue() as SysDictData), dictType: this.currentType() };
    const request$ = this.dataEdit() ? this.dataApi.updateData(payload) : this.dataApi.addData(payload);
    request$.subscribe({
      next: () => {
        this.message.success(this.dataEdit() ? '修改成功' : '新增成功');
        this.submitting.set(false);
        this.dataDialog.set(false);
        this.dictStore.removeDict(this.currentType());
        this.getDataList();
      },
      error: () => this.submitting.set(false),
    });
  }

  deleteData(row?: SysDictData): void {
    const targets = row ? [row] : this.dataRows();
    if (!targets.length) {
      return;
    }
    const ids = targets.map((item) => item.dictCode) as number[];
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: '是否确认删除选中的字典数据？',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        let pending = ids.length;
        ids.forEach((id) => {
          this.dataApi.delData(id).subscribe({
            next: () => {
              pending -= 1;
              if (pending === 0) {
                this.message.success('删除成功');
                this.dataChecked.set(new Set());
                this.dictStore.removeDict(this.currentType());
                this.getDataList();
              }
            },
          });
        });
      },
    });
  }

  exportData(): void {
    if (!this.currentType()) {
      return;
    }
    const query = this.dataQuery();
    const params: Record<string, unknown> = Object.fromEntries(
      Object.entries(query).filter(([key]) => key !== 'pageNum' && key !== 'pageSize'),
    );
    const filename = `dict_data_${parseTime(new Date(), '{y}{m}{d}{h}{i}{s}')}.xlsx`;
    this.download.download('/system/dict/data/export', params, filename).subscribe({
      next: () => this.message.success('导出成功'),
    });
  }
}
