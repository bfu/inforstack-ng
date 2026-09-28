import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { NzTreeSelectModule } from 'ng-zorro-antd/tree-select';
import { DictTypeApi } from '@api/system/dict/type';
import { SysMenuApi } from '@api/system/menu';
import { GenApi } from '@api/tool/gen';
import { SysDictType, SysMenu } from '@core/models/system';
import { DEFAULT_TPL_WEB_TYPE, GenTable, GenTableColumn } from '@core/models/tool';
import { handleTree } from '@core/utils/ruoyi';

type ColumnFlag = 'isInsert' | 'isEdit' | 'isList' | 'isQuery' | 'isRequired';

/** 修改生成配置，对应 ruoyi-vue3/src/views/tool/gen/editTable.vue */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-gen-edit-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzFormModule,
    NzGridModule,
    NzInputModule,
    NzRadioModule,
    NzSelectModule,
    NzTableModule,
    NzTabsModule,
    NzTreeSelectModule,
  ],
  templateUrl: './gen-edit.html',
  styleUrl: './gen-edit.less',
})
export class GenEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(GenApi);
  private readonly menuApi = inject(SysMenuApi);
  private readonly dictApi = inject(DictTypeApi);
  private readonly fb = inject(FormBuilder);
  private readonly message = inject(NzMessageService);

  readonly activeTab = signal(1);
  readonly loading = signal(false);
  readonly submitting = signal(false);

  readonly columns = signal<GenTableColumn[]>([]);
  readonly tables = signal<GenTable[]>([]);
  readonly dictOptions = signal<SysDictType[]>([]);
  readonly menuOptions = signal<NzTreeNodeOptions[]>([]);

  /** 供模板做条件渲染（表单值无法直接在模板中做信号订阅） */
  readonly tplCategory = signal<'crud' | 'tree' | 'sub'>('crud');
  readonly genType = signal<'0' | '1'>('0');
  readonly subTableName = signal('');

  readonly subColumns = computed(() => {
    const name = this.subTableName();
    return this.tables().find((item) => item.tableName === name)?.columns ?? [];
  });

  readonly javaTypes = ['Long', 'String', 'Integer', 'Double', 'BigDecimal', 'Date', 'Boolean'];
  readonly queryTypes = [
    { label: '=', value: 'EQ' },
    { label: '!=', value: 'NE' },
    { label: '>', value: 'GT' },
    { label: '>=', value: 'GTE' },
    { label: '<', value: 'LT' },
    { label: '<=', value: 'LTE' },
    { label: 'LIKE', value: 'LIKE' },
    { label: 'BETWEEN', value: 'BETWEEN' },
  ];
  readonly htmlTypes = [
    { label: '文本框', value: 'input' },
    { label: '文本域', value: 'textarea' },
    { label: '下拉框', value: 'select' },
    { label: '单选框', value: 'radio' },
    { label: '复选框', value: 'checkbox' },
    { label: '日期控件', value: 'datetime' },
    { label: '图片上传', value: 'imageUpload' },
    { label: '文件上传', value: 'fileUpload' },
    { label: '富文本控件', value: 'editor' },
  ];
  readonly formColOptions = [
    { label: '单列', value: 1 },
    { label: '双列', value: 2 },
    { label: '三列', value: 3 },
  ];
  readonly tplWebTypes = [
    { label: 'Angular NG-ZORRO 模版', value: 'angular' },
    { label: 'Vue3 Element Plus 模版', value: 'element-plus' },
    { label: 'Vue3 Element Plus TypeScript 模版', value: 'element-plus-typescript' },
  ];

  readonly basicForm = this.fb.nonNullable.group({
    tableName: ['', Validators.required],
    tableComment: ['', Validators.required],
    className: ['', Validators.required],
    functionAuthor: ['', Validators.required],
    remark: [''],
  });

  readonly genForm = this.fb.nonNullable.group({
    tplCategory: ['crud' as 'crud' | 'tree' | 'sub', Validators.required],
    tplWebType: [DEFAULT_TPL_WEB_TYPE],
    packageName: ['', Validators.required],
    moduleName: ['', Validators.required],
    businessName: ['', Validators.required],
    functionName: ['', Validators.required],
    formColNum: [1],
    view: [false],
    genType: ['0' as '0' | '1'],
    genPath: [''],
    parentMenuId: [''],
    treeCode: [''],
    treeParentCode: [''],
    treeName: [''],
    subTableName: [''],
    subTableFkName: [''],
  });

  private readonly info = signal<GenTable>({});
  private tableId = '';
  private pageNum = '';

  constructor() {
    this.genForm.controls.tplCategory.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const category = value ?? 'crud';
      this.tplCategory.set(category);
      if (category !== 'sub') {
        this.genForm.patchValue({ subTableName: '', subTableFkName: '' });
      }
    });
    this.genForm.controls.subTableName.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        this.subTableName.set(value ?? '');
        this.genForm.patchValue({ subTableFkName: '' });
      });
    this.genForm.controls.genType.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.genType.set(value ?? '0');
    });
    this.genForm.controls.tplWebType.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      if (!value) {
        this.genForm.patchValue({ tplWebType: DEFAULT_TPL_WEB_TYPE });
      }
    });
  }

  ngOnInit(): void {
    this.tableId = this.route.snapshot.paramMap.get('tableId') ?? '';
    this.pageNum = this.route.snapshot.queryParamMap.get('pageNum') ?? '';
    if (!this.tableId) {
      return;
    }
    this.loading.set(true);
    this.loadDictOptions();
    this.loadMenuOptions();
    this.api.getGenTable(this.tableId).subscribe({
      next: (res) => {
        const detail = res.data;
        const info = detail?.info ?? {};
        this.info.set(info);
        this.columns.set(detail?.rows ?? info.columns ?? []);
        this.tables.set(detail?.tables ?? []);
        this.fillForm(info);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private fillForm(info: GenTable): void {
    this.basicForm.patchValue({
      tableName: info.tableName ?? '',
      tableComment: info.tableComment ?? '',
      className: info.className ?? '',
      functionAuthor: info.functionAuthor ?? '',
      remark: info.remark ?? '',
    });
    const tplCategory = info.tplCategory ?? 'crud';
    const genType = info.genType ?? '0';
    // emitEvent: false —— 首次回填不触发 valueChanges，避免清空已保存的外键/树字段
    this.genForm.patchValue(
      {
        tplCategory,
        tplWebType: info.tplWebType || DEFAULT_TPL_WEB_TYPE,
        packageName: info.packageName ?? '',
        moduleName: info.moduleName ?? '',
        businessName: info.businessName ?? '',
        functionName: info.functionName ?? '',
        formColNum: info.formColNum ?? 1,
        view: info.view ?? false,
        genType,
        genPath: info.genPath ?? '',
        parentMenuId: info.parentMenuId ? String(info.parentMenuId) : '',
        treeCode: info.treeCode ?? '',
        treeParentCode: info.treeParentCode ?? '',
        treeName: info.treeName ?? '',
        subTableName: info.subTableName ?? '',
        subTableFkName: info.subTableFkName ?? '',
      },
      { emitEvent: false },
    );
    this.tplCategory.set(tplCategory);
    this.genType.set(genType);
    this.subTableName.set(info.subTableName ?? '');
  }

  private loadDictOptions(): void {
    this.dictApi.optionselect().subscribe({
      next: (res) => this.dictOptions.set(res.data ?? []),
    });
  }

  private loadMenuOptions(): void {
    this.menuApi.listMenu().subscribe({
      next: (res) => {
        const tree = handleTree<SysMenu>(res.data ?? [], 'menuId');
        this.menuOptions.set(this.toMenuNodes(tree));
      },
    });
  }

  private toMenuNodes(list: SysMenu[]): NzTreeNodeOptions[] {
    return (list ?? []).map((item) => {
      const children = item.children?.length ? this.toMenuNodes(item.children) : undefined;
      return {
        title: item.menuName ?? '',
        key: String(item.menuId),
        isLeaf: !children?.length,
        children,
      };
    });
  }

  /**
   * 布尔标记位，后端以 char(1) 的 "0"/"1" 存储。
   * 按行下标做不可变更新：直接改 col 不会让 columns() signal 通知，
   * 且 OnPush 下依赖默认变更检测才刷新的写法会失效。
   */
  setFlag(index: number, key: ColumnFlag, checked: boolean): void {
    const value = checked ? '1' : '0';
    this.columns.update((list) =>
      list.map((col, i) => (i === index ? { ...col, [key]: value } : col)),
    );
  }

  isFlagOn(col: GenTableColumn, key: ColumnFlag): boolean {
    return col[key] === '1';
  }

  columnLabel(col: GenTableColumn): string {
    return `${col.columnName ?? ''}：${col.columnComment ?? ''}`;
  }

  resetGenPath(): void {
    this.genForm.patchValue({ genPath: '/' });
  }

  submit(): void {
    if (this.basicForm.invalid || this.genForm.invalid) {
      this.basicForm.markAllAsTouched();
      this.genForm.markAllAsTouched();
      this.message.error('表单校验未通过，请重新检查提交内容');
      return;
    }
    const basic = this.basicForm.getRawValue();
    const gen = this.genForm.getRawValue();
    const parentMenuId = gen.parentMenuId ? Number(gen.parentMenuId) : undefined;
    const payload: GenTable = {
      tableId: this.info().tableId,
      tableName: basic.tableName,
      tableComment: basic.tableComment,
      className: basic.className,
      functionAuthor: basic.functionAuthor,
      remark: basic.remark,
      tplCategory: gen.tplCategory,
      tplWebType: gen.tplWebType || DEFAULT_TPL_WEB_TYPE,
      packageName: gen.packageName,
      moduleName: gen.moduleName,
      businessName: gen.businessName,
      functionName: gen.functionName,
      formColNum: gen.formColNum,
      genType: gen.genType,
      genPath: gen.genPath,
      subTableName: gen.subTableName,
      subTableFkName: gen.subTableFkName,
      columns: this.columns().map((col, index) => ({ ...col, sort: index + 1 })),
      params: {
        genView: gen.view ? '1' : '0',
        treeCode: gen.treeCode,
        treeName: gen.treeName,
        treeParentCode: gen.treeParentCode,
        parentMenuId,
      },
    };
    this.submitting.set(true);
    this.api.updateGenTable(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.message.success(res.msg);
        if (res.code === 200) {
          this.close();
        }
      },
      error: () => this.submitting.set(false),
    });
  }

  close(): void {
    void this.router.navigate(['/tool/gen'], {
      queryParams: { t: Date.now(), pageNum: this.pageNum || undefined },
    });
  }
}
