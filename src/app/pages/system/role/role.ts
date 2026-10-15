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
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzFormatEmitEvent, NzTreeModule, NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { RoleApi } from '@api/system/role';
import { SysMenuApi } from '@api/system/menu';
import { DownloadService } from '@core/download.service';
import { PageQuery, TreeSelectNode } from '@core/models/result';
import { SysRole } from '@core/models/system';
import { parseTime } from '@core/utils/ruoyi';
import { DictStore } from '@store/dict.store';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import {
  collectRootKeys,
  collectTreeKeys,
  expandLinkedCheckedKeys,
  isTreeFullyChecked,
  splitBackfillKeys,
  toTreeNodes,
  withCheckedKeys,
  withExpandedKeys,
} from '@shared/utils/tree.util';
import { TableSelection } from '@shared/utils/table-selection';
import { environment } from '@env/environment';

/** 角色管理，对应 ruoyi-vue3/src/views/system/role/index.vue */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-role-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    HasPermiDirective,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzDatePickerModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzModalModule,
    NzRadioModule,
    NzSelectModule,
    NzSwitchModule,
    NzTableModule,
    NzTooltipModule,
    NzTreeModule,
  ],
  templateUrl: './role.html',
  styleUrl: './role.less',
})
export class RolePage implements OnInit {
  private readonly api = inject(RoleApi);
  private readonly menuApi = inject(SysMenuApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly download = inject(DownloadService);
  private readonly dictStore = inject(DictStore);
  private readonly router = inject(Router);

  readonly searchForm = this.fb.nonNullable.group({
    roleName: [''],
    roleKey: [''],
    status: [''],
  });

  readonly dateRange = signal<Date[]>([]);

  readonly rows = signal<SysRole[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly pageNum = signal(1);
  readonly pageSize = signal(environment.pageSize);

  /** 表格多选状态 */
  readonly selection = new TableSelection<SysRole, number>((row) => row.roleId);

  readonly dialogVisible = signal(false);
  readonly dialogTitle = signal('');
  readonly submitting = signal(false);
  /** 菜单树节点；回填的勾选状态写在节点 `checked` 上（见 applyMenuTree） */
  readonly menuNodes = signal<NzTreeNodeOptions[]>([]);
  /** 菜单树是否父子联动，与角色的 menu_check_strictly 配对（后端据此过滤父节点） */
  readonly menuCheckStrictly = signal(true);
  /** 树上勾选的「端点」集合，语义与后端 checkedKeys、nzCheckboxChange 的 keys 一致 */
  readonly checkedMenuKeys = signal<string[]>([]);
  /** 联动模式下无法在树上表示、提交时原样带上的菜单（见 splitBackfillKeys） */
  private readonly carriedMenuKeys = signal<string[]>([]);
  /** 「展开/折叠」复选框状态；对齐 RuoYi-Vue3 的 reset()：菜单树初始收起 */
  readonly menuExpand = signal(false);
  /** 「全选/全不选」复选框状态 */
  readonly menuNodeAll = signal(false);
  /** 菜单树当前展开的节点 key：由 (nzExpandChange) 同步，重建 nzData 时据此保留展开态 */
  readonly menuExpandedKeys = signal<string[]>([]);

  readonly form = this.fb.group({
    roleId: [undefined as number | undefined],
    roleName: ['', [Validators.required]],
    roleKey: ['', [Validators.required]],
    roleSort: [0, [Validators.required]],
    status: ['0'],
    menuIds: [[] as number[]],
    remark: [''],
  });

  /** 是否编辑态：表单值不是 signal，必须用 getter 实时读取（computed 会缓存首次结果） */
  get isEdit(): boolean {
    return this.form.controls.roleId.value != null;
  }
  readonly statusOptions = computed(() => this.dictStore.getDict('sys_normal_disable') ?? []);
  readonly dataScopeOptions = computed(() => this.dictStore.getDict('sys_data_scope') ?? []);

  // 数据权限弹窗
  readonly scopeVisible = signal(false);
  readonly scopeSubmitting = signal(false);
  readonly scopeRoleId = signal<number | undefined>(undefined);
  readonly scopeDataScope = signal('1');
  readonly deptNodes = signal<NzTreeNodeOptions[]>([]);
  /** 部门树是否父子联动，与角色的 dept_check_strictly 配对 */
  readonly deptCheckStrictly = signal(true);
  readonly checkedDeptKeys = signal<string[]>([]);
  /** 联动模式下无法在树上表示、提交时原样带上的部门 */
  private readonly carriedDeptKeys = signal<string[]>([]);
  /** 「展开/折叠」复选框状态；对齐 RuoYi-Vue3 的 reset()：部门树初始展开 */
  readonly deptExpand = signal(true);
  /** 「全选/全不选」复选框状态 */
  readonly deptNodeAll = signal(false);
  /** 部门树当前展开的节点 key，语义同 menuExpandedKeys */
  readonly deptExpandedKeys = signal<string[]>([]);

  ngOnInit(): void {
    for (const type of ['sys_normal_disable', 'sys_data_scope']) {
      if (!this.dictStore.getDict(type)) {
        this.dictStore.loadDict(type).subscribe();
      }
    }
    // nz-table 的 (nzQueryParams) 带 skip(1)，首次进入不会触发，需显式发起首查
    this.getList();
  }

  private buildQuery(): PageQuery {
    const value = this.searchForm.getRawValue();
    const query: PageQuery = {
      pageNum: this.pageNum(),
      pageSize: this.pageSize(),
      roleName: value.roleName || undefined,
      roleKey: value.roleKey || undefined,
      status: value.status || undefined,
    };
    const range = this.dateRange()?.length
      ? [
          parseTime(this.dateRange()[0], '{y}-{m}-{d}') ?? '',
          parseTime(this.dateRange()[1], '{y}-{m}-{d}') ?? '',
        ]
      : [];
    if (range.length) {
      query['params[beginTime]'] = range[0];
      query['params[endTime]'] = range[1];
    }
    return query;
  }

  getList(): void {
    this.loading.set(true);
    this.api.listRole(this.buildQuery()).subscribe({
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
    this.searchForm.reset({ roleName: '', roleKey: '', status: '' });
    this.dateRange.set([]);
    this.pageNum.set(1);
    this.getList();
  }

  selectedRows(): SysRole[] {
    return this.selection.selectedRows(this.rows());
  }

  openAdd(): void {
    this.resetForm();
    this.menuApi.treeselect().subscribe({
      next: (res) => {
        // 新增角色走 sys_role.menu_check_strictly 的库内默认值（1：父子互相关联）
        this.applyMenuTree(res.data ?? [], [], true);
        this.dialogTitle.set('添加角色');
        this.dialogVisible.set(true);
      },
    });
  }

  /**
   * 装载菜单树。
   *
   * `linked`（父子联动）必须与角色的 menu_check_strictly 配对：该字段既控制后端
   * `SysMenuMapper.selectMenuListByRoleId` 是否过滤掉父节点，也控制前端树的联动；
   * 两者不配对会出现「打开弹窗即全选」或「保存后侧边栏断链」。
   */
  private applyMenuTree(menus: TreeSelectNode[], checkedKeys: number[], linked: boolean): void {
    this.menuExpand.set(false); // RuoYi-Vue3 reset()：菜单树初始收起
    this.menuNodeAll.set(false);
    this.loadMenuNodes(toTreeNodes(menus), checkedKeys.map(String), linked, []);
  }

  /**
   * 用「节点 + 勾选键 + 联动模式 + 展开键」重装菜单树，三控件的全部动作都收敛到这里。
   *
   * 勾选与展开都必须写进节点数据（`withCheckedKeys` / `withExpandedKeys`）：
   * - `nzCheckedKeys` 会被 `nzCheckStrictly` 的 ngOnChanges 里的 `handleCheckedKeys(null)` 覆盖；
   * - `conductExpandedKeys` 里的 `|| node.isExpanded` 让折叠永远无法通过 `nzExpandedKeys` 生效。
   */
  private loadMenuNodes(
    nodes: NzTreeNodeOptions[],
    checkedKeys: Iterable<string>,
    linked: boolean,
    expandedKeys: Iterable<string>,
  ): void {
    const { fillable, carried } = splitBackfillKeys(nodes, checkedKeys, linked);
    this.menuCheckStrictly.set(linked);
    this.checkedMenuKeys.set(fillable);
    this.carriedMenuKeys.set(carried);
    this.menuExpandedKeys.set([...expandedKeys]);
    this.menuNodes.set(withExpandedKeys(withCheckedKeys(nodes, fillable), expandedKeys));
  }

  openEdit(row: SysRole): void {
    this.resetForm();
    this.form.patchValue({
      roleId: row.roleId,
      roleName: row.roleName ?? '',
      roleKey: row.roleKey ?? '',
      roleSort: row.roleSort ?? 0,
      status: row.status ?? '0',
      remark: row.remark ?? '',
    });
    this.menuApi.roleMenuTreeselect(row.roleId!).subscribe({
      next: (res) => {
        this.applyMenuTree(res.menus ?? [], res.checkedKeys ?? [], row.menuCheckStrictly !== false);
        this.dialogTitle.set('修改角色');
        this.dialogVisible.set(true);
      },
    });
  }

  private resetForm(): void {
    this.form.reset({
      roleId: undefined,
      roleName: '',
      roleKey: '',
      roleSort: 0,
      status: '0',
      menuIds: [],
      remark: '',
    });
  }

  /**
   * 树勾选变化。
   *
   * 事件名必须是 ng-zorro 声明的 `nzCheckboxChange`（小写 b）——Angular 的输出绑定
   * 大小写敏感，写错不报错、只静默降级成同名 DOM 事件，回调永不触发。
   * 事件 `keys` 只含「勾选端点」（联动模式下不含被全选的父节点），提交时再展开。
   */
  onMenuCheck(event: NzFormatEmitEvent): void {
    const keys = event.keys ?? [];
    this.checkedMenuKeys.set(keys);
    this.menuNodeAll.set(isTreeFullyChecked(this.menuNodes(), keys));
  }

  /** 用户手动展开/折叠后同步展开态，供后续重建 nzData（全选、切换联动）时保留 */
  onMenuExpandChange(event: NzFormatEmitEvent): void {
    this.menuExpandedKeys.set(event.keys ?? []);
  }

  /**
   * 展开/折叠：只作用于根级节点（对齐 RuoYi-Vue3 的 `handleCheckedTreeExpand`），
   * 更深层节点保留各自的展开状态——故折叠是「从展开集合里摘掉根 key」而不是清空。
   */
  toggleMenuExpand(value: boolean): void {
    this.menuExpand.set(value);
    const roots = collectRootKeys(this.menuNodes());
    const expanded = this.menuExpandedKeys();
    const next = value
      ? [...new Set([...expanded, ...roots])]
      : expanded.filter((key) => !roots.includes(key));
    this.loadMenuNodes(this.menuNodes(), this.checkedMenuKeys(), this.menuCheckStrictly(), next);
  }

  /**
   * 全选/全不选（对齐 RuoYi-Vue3 的 `handleCheckedTreeNodeAll`）。
   *
   * `loadMenuNodes` 会按新的勾选集合重算 `carried`，所以「全不选」天然把 carried 清空；
   * 否则用户点了全不选、提交后权限仍在，与预期相反。
   */
  toggleMenuNodes(value: boolean): void {
    this.menuNodeAll.set(value);
    const keys = value ? collectTreeKeys(this.menuNodes()) : [];
    this.loadMenuNodes(this.menuNodes(), keys, this.menuCheckStrictly(), this.menuExpandedKeys());
  }

  /**
   * 父子联动。
   *
   * 对齐 RuoYi-Vue3 的 `handleCheckedTreeConnect`（写回角色字段并落库），但比它更保守：
   * RuoYi 只改 form 字段、树上勾选原样不动，切换后容易「不联动→联动」放大权限。
   * 这里以「当前将要提交的集合」为基准在新模式下重新解读，保证切换前后提交结果一致。
   */
  setMenuCheckStrictly(linked: boolean): void {
    this.loadMenuNodes(
      this.menuNodes(),
      this.menuPayload().map(String),
      linked,
      this.menuExpandedKeys(),
    );
  }

  /**
   * 提交给后端的菜单集合。
   *
   * 联动模式必须补上「半选父节点」，等价 RuoYi-Vue3 的
   * `getMenuAllCheckedKeys()` = `getCheckedKeys() ∪ getHalfCheckedKeys()`：
   * 后端 `insertRoleMenu` 原样入库、不补父节点，而 `selectMenuTreeByUserId` 只返回
   * `sys_role_menu` 里有记录的菜单，漏掉父节点会让整棵子树在侧边栏里消失。
   */
  private menuPayload(): number[] {
    const keys = this.menuCheckStrictly()
      ? expandLinkedCheckedKeys(this.menuNodes(), this.checkedMenuKeys())
      : this.checkedMenuKeys();
    return [...new Set([...this.carriedMenuKeys(), ...keys])].map(Number);
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
    const value = this.form.getRawValue();
    const payload: SysRole = {
      ...value,
      menuIds: this.menuPayload(),
      // 父子联动必须落库：menu_check_strictly 决定后端是否过滤父节点，
      // 不回写就会出现「前端不联动、后端按联动过滤」的错配
      menuCheckStrictly: this.menuCheckStrictly(),
    } as SysRole;
    const request$ = this.isEdit ? this.api.updateRole(payload) : this.api.addRole(payload);
    request$.subscribe({
      next: () => {
        this.message.success(this.isEdit ? '修改成功' : '新增成功');
        this.submitting.set(false);
        this.dialogVisible.set(false);
        this.getList();
      },
      error: () => this.submitting.set(false),
    });
  }

  delete(row?: SysRole): void {
    const targets = row ? [row] : this.selectedRows();
    if (!targets.length) {
      return;
    }
    const ids = targets.map((item) => item.roleId) as number[];
    const names = targets.map((item) => item.roleName).join('、');
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认删除角色名称为「${names}」的数据项？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.api.delRole(ids).subscribe({
          next: () => {
            this.message.success('删除成功');
            this.selection.clear();
            this.getList();
          },
        });
      },
    });
  }

  /**
   * 切换角色状态。
   * 开关是单向绑定，原地改 row.status 不会让 signal 通知、视图也不刷新，
   * 故先乐观更新让数据与开关一致，取消或失败时再回滚。
   */
  statusChange(row: SysRole, checked: boolean): void {
    const next = checked ? '0' : '1';
    const previous = row.status ?? '0';
    if (next === previous) {
      return;
    }
    const text = next === '0' ? '启用' : '停用';
    this.setRowStatus(row.roleId, next);
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `确认要${text}「${row.roleName}」角色吗？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOnOk: () => {
        this.api.changeStatus(row.roleId!, next).subscribe({
          next: () => this.message.success(`${text}成功`),
          error: () => this.setRowStatus(row.roleId, previous),
        });
      },
      nzOnCancel: () => this.setRowStatus(row.roleId, previous),
    });
  }

  /** 以不可变方式更新行状态，保证开关绑定值随数据变化 */
  private setRowStatus(roleId: number | undefined, status: string): void {
    if (roleId === undefined) {
      return;
    }
    this.rows.update((list) =>
      list.map((item) => (item.roleId === roleId ? { ...item, status } : item)),
    );
  }

  /** 打开数据权限弹窗 */
  openDataScope(row: SysRole): void {
    this.scopeRoleId.set(row.roleId);
    this.scopeDataScope.set(row.dataScope ?? '1');
    this.checkedDeptKeys.set([]);
    this.carriedDeptKeys.set([]);
    this.api.deptTree(row.roleId!).subscribe({
      next: (res) => {
        // 与菜单树同构：dept_check_strictly 既控制后端 selectDeptListByRoleId 是否过滤父节点，
        // 也控制前端树的联动，必须配对
        const nodes = toTreeNodes(res.depts ?? []);
        // RuoYi-Vue3 的部门树是 default-expand-all（全展开），reset() 里 deptExpand=true
        this.deptExpand.set(true);
        this.deptNodeAll.set(false);
        this.loadDeptNodes(
          nodes,
          (res.checkedKeys ?? []).map(String),
          row.deptCheckStrictly !== false,
          collectTreeKeys(nodes),
        );
        this.scopeVisible.set(true);
      },
    });
  }

  /** 部门树的重装逻辑，与 loadMenuNodes 同构 */
  private loadDeptNodes(
    nodes: NzTreeNodeOptions[],
    checkedKeys: Iterable<string>,
    linked: boolean,
    expandedKeys: Iterable<string>,
  ): void {
    const { fillable, carried } = splitBackfillKeys(nodes, checkedKeys, linked);
    this.deptCheckStrictly.set(linked);
    this.checkedDeptKeys.set(fillable);
    this.carriedDeptKeys.set(carried);
    this.deptExpandedKeys.set([...expandedKeys]);
    this.deptNodes.set(withExpandedKeys(withCheckedKeys(nodes, fillable), expandedKeys));
  }

  onDeptCheck(event: NzFormatEmitEvent): void {
    const keys = event.keys ?? [];
    this.checkedDeptKeys.set(keys);
    this.deptNodeAll.set(isTreeFullyChecked(this.deptNodes(), keys));
  }

  onDeptExpandChange(event: NzFormatEmitEvent): void {
    this.deptExpandedKeys.set(event.keys ?? []);
  }

  /** 展开/折叠：只作用于根级节点，语义同 toggleMenuExpand */
  toggleDeptExpand(value: boolean): void {
    this.deptExpand.set(value);
    const roots = collectRootKeys(this.deptNodes());
    const expanded = this.deptExpandedKeys();
    const next = value
      ? [...new Set([...expanded, ...roots])]
      : expanded.filter((key) => !roots.includes(key));
    this.loadDeptNodes(this.deptNodes(), this.checkedDeptKeys(), this.deptCheckStrictly(), next);
  }

  toggleDeptNodes(value: boolean): void {
    this.deptNodeAll.set(value);
    const keys = value ? collectTreeKeys(this.deptNodes()) : [];
    this.loadDeptNodes(this.deptNodes(), keys, this.deptCheckStrictly(), this.deptExpandedKeys());
  }

  setDeptCheckStrictly(linked: boolean): void {
    this.loadDeptNodes(
      this.deptNodes(),
      this.deptPayload().map(String),
      linked,
      this.deptExpandedKeys(),
    );
  }

  /** 提交给后端的数据权限部门集合，语义与 menuPayload 一致 */
  private deptPayload(): number[] {
    const keys = this.deptCheckStrictly()
      ? expandLinkedCheckedKeys(this.deptNodes(), this.checkedDeptKeys())
      : this.checkedDeptKeys();
    return [...new Set([...this.carriedDeptKeys(), ...keys])].map(Number);
  }

  submitDataScope(): void {
    const roleId = this.scopeRoleId();
    if (roleId === undefined) {
      return;
    }
    this.scopeSubmitting.set(true);
    this.api
      .dataScope(roleId, this.scopeDataScope(), this.deptPayload(), this.deptCheckStrictly())
      .subscribe({
        next: () => {
          this.message.success('设置成功');
          this.scopeSubmitting.set(false);
          this.scopeVisible.set(false);
          this.getList();
        },
        error: () => this.scopeSubmitting.set(false),
      });
  }

  authUser(row: SysRole): void {
    void this.router.navigate(['/system/role-auth/user', row.roleId]);
  }

  export(): void {
    const query = this.buildQuery();
    const params: Record<string, unknown> = Object.fromEntries(
      Object.entries(query).filter(([key]) => key !== 'pageNum' && key !== 'pageSize'),
    );
    const filename = `role_${parseTime(new Date(), '{y}{m}{d}{h}{i}{s}')}.xlsx`;
    this.download.download('/system/role/export', params, filename).subscribe({
      next: () => this.message.success('导出成功'),
    });
  }
}
