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
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzTreeSelectModule } from 'ng-zorro-antd/tree-select';
import { NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { SysMenuApi } from '../../../api/system/menu';
import { SysMenu } from '../../../core/models/system';
import { DictStore } from '../../../store/dict.store';
import { DictTag } from '../../../shared/components/dict-tag/dict-tag';
import { HasPermiDirective } from '../../../shared/directives/has-permi.directive';
import { toTreeNodes } from '../../../shared/utils/tree.util';
import { MENU_ICON_NAMES, resolveMenuIcon } from '../../../layout/icon-map';
import { TableSelection } from '../../../shared/utils/table-selection';

interface MenuRow extends SysMenu {
  level: number;
}

/** 菜单管理，对应 ruoyi-vue3/src/views/system/menu/index.vue */
@Component({
  selector: 'app-menu-page',
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
    NzSwitchModule,
    NzTableModule,
    NzTooltipModule,
    NzTreeSelectModule,
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.less',
})
export class MenuPage implements OnInit {
  private readonly api = inject(SysMenuApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly dictStore = inject(DictStore);

  readonly searchForm = this.fb.nonNullable.group({
    menuName: [''],
    status: [''],
  });

  readonly menuTree = signal<SysMenu[]>([]);
  readonly expandedIds = signal<Set<number>>(new Set());
  readonly loading = signal(false);
  /** 表格多选状态 */
  readonly selection = new TableSelection<SysMenu, number>((row) => row.menuId);

  /** 可选菜单图标（RuoYi 原始名，保存回后端） */
  readonly icons = MENU_ICON_NAMES;

  /** RuoYi 图标名 → ant design 图标名，供模板渲染 */
  readonly resolveIcon = resolveMenuIcon;

  /** 展开后的平铺行（带层级缩进） */
  readonly flatRows = computed<MenuRow[]>(() => {
    const rows: MenuRow[] = [];
    const walk = (nodes: SysMenu[], level: number) => {
      for (const node of nodes) {
        rows.push({ ...node, level });
        if (node.children?.length && node.menuId !== undefined && this.expandedIds().has(node.menuId)) {
          walk(node.children, level + 1);
        }
      }
    };
    walk(this.menuTree(), 0);
    return rows;
  });

  readonly allExpanded = computed(() => {
    const total = this.countNodes(this.menuTree());
    return total > 0 && this.expandedIds().size >= total;
  });

  readonly dialogVisible = signal(false);
  readonly dialogTitle = signal('');
  readonly submitting = signal(false);
  readonly parentOptions = signal<NzTreeNodeOptions[]>([]);

  readonly form = this.fb.group({
    menuId: [undefined as number | undefined],
    menuType: ['M'],
    parentId: [0],
    menuName: ['', [Validators.required]],
    icon: [''],
    orderNum: [0, [Validators.required]],
    isFrame: ['1'],
    path: [''],
    component: [''],
    perms: [''],
    query: [''],
    visible: ['0'],
    status: ['0'],
    isCache: ['0'],
  });

  readonly isEdit = computed(() => this.form.controls.menuId.value !== undefined);
  readonly menuType = computed(() => this.form.controls.menuType.value ?? 'M');
  readonly statusOptions = computed(() => this.dictStore.getDict('sys_normal_disable') ?? []);
  readonly visibleOptions = computed(() => this.dictStore.getDict('sys_show_hide') ?? []);
  readonly cacheOptions = computed(() => this.dictStore.getDict('sys_yes_no') ?? []);

  ngOnInit(): void {
    for (const type of ['sys_normal_disable', 'sys_show_hide', 'sys_yes_no']) {
      if (!this.dictStore.getDict(type)) {
        this.dictStore.loadDict(type).subscribe();
      }
    }
    this.getList();
  }

  private countNodes(nodes: SysMenu[]): number {
    return nodes.reduce((sum, node) => sum + 1 + this.countNodes(node.children ?? []), 0);
  }

  /** 平铺列表 → 菜单树 */
  private buildTree(list: SysMenu[]): SysMenu[] {
    const map = new Map<number, SysMenu>();
    list.forEach((item) => map.set(item.menuId!, { ...item, children: [] }));
    const roots: SysMenu[] = [];
    map.forEach((item) => {
      const parentId = item.parentId ?? 0;
      const parent = parentId === 0 ? undefined : map.get(parentId);
      if (parent) {
        (parent.children ??= []).push(item);
      } else {
        roots.push(item);
      }
    });
    return roots;
  }

  getList(): void {
    this.loading.set(true);
    const value = this.searchForm.getRawValue();
    this.api.listMenu({ menuName: value.menuName || undefined, status: value.status || undefined }).subscribe({
      next: (res) => {
        const tree = this.buildTree(res.data ?? []);
        this.menuTree.set(tree);
        if (!this.expandedIds().size) {
          this.expandedIds.set(new Set(tree.map((item) => item.menuId!)));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resetQuery(): void {
    this.searchForm.reset({ menuName: '', status: '' });
    this.getList();
  }

  toggleExpandAll(): void {
    if (this.allExpanded()) {
      this.expandedIds.set(new Set());
    } else {
      const ids = new Set<number>();
      const walk = (nodes: SysMenu[]) => {
        nodes.forEach((node) => {
          if (node.menuId !== undefined) {
            ids.add(node.menuId);
          }
          walk(node.children ?? []);
        });
      };
      walk(this.menuTree());
      this.expandedIds.set(ids);
    }
  }

  toggleRow(row: MenuRow): void {
    if (!row.children?.length || row.menuId === undefined) {
      return;
    }
    const ids = new Set(this.expandedIds());
    if (ids.has(row.menuId)) {
      ids.delete(row.menuId);
    } else {
      ids.add(row.menuId);
    }
    this.expandedIds.set(ids);
  }

  selectedRows(): SysMenu[] {
    const result: SysMenu[] = [];
    const walk = (nodes: SysMenu[]) => {
      nodes.forEach((node) => {
        if (this.selection.hasKey(node.menuId)) {
          result.push(node);
        }
        walk(node.children ?? []);
      });
    };
    walk(this.menuTree());
    return result;
  }

  private loadParentOptions(currentId?: number): void {
    this.api.treeselect().subscribe({
      next: (res) => {
        const nodes = toTreeNodes(res.data ?? []).filter((node) => String(node.key) !== String(currentId));
        this.parentOptions.set([
          { title: '主类目', key: '0', isLeaf: true, children: nodes.length ? nodes : undefined },
        ]);
      },
    });
  }

  openAdd(parentId?: number): void {
    this.resetForm();
    if (parentId !== undefined) {
      this.form.patchValue({ parentId });
    }
    this.loadParentOptions();
    this.dialogTitle.set('添加菜单');
    this.dialogVisible.set(true);
  }

  openEdit(row: SysMenu): void {
    this.resetForm();
    this.form.patchValue({
      menuId: row.menuId,
      menuType: row.menuType ?? 'M',
      parentId: row.parentId ?? 0,
      menuName: row.menuName ?? '',
      icon: row.icon ?? '',
      orderNum: row.orderNum ?? 0,
      isFrame: row.isFrame ?? '1',
      path: row.path ?? '',
      component: row.component ?? '',
      perms: row.perms ?? '',
      query: row.query ?? '',
      visible: row.visible ?? '0',
      status: row.status ?? '0',
      isCache: row.isCache ?? '0',
    });
    this.loadParentOptions(row.menuId);
    this.dialogTitle.set('修改菜单');
    this.dialogVisible.set(true);
  }

  private resetForm(): void {
    this.form.reset({
      menuId: undefined,
      menuType: 'M',
      parentId: 0,
      menuName: '',
      icon: '',
      orderNum: 0,
      isFrame: '1',
      path: '',
      component: '',
      perms: '',
      query: '',
      visible: '0',
      status: '0',
      isCache: '0',
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
    const payload = this.form.getRawValue() as SysMenu;
    const request$ = this.isEdit() ? this.api.updateMenu(payload) : this.api.addMenu(payload);
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

  delete(row?: SysMenu): void {
    const targets = row ? [row] : this.selectedRows();
    if (!targets.length) {
      return;
    }
    const names = targets.map((item) => item.menuName).join('、');
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认删除名称为「${names}」的数据项？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        // 逐条删除，后端一次仅接受一个菜单编号
        let pending = targets.length;
        targets.forEach((item) => {
          this.api.delMenu(item.menuId!).subscribe({
            next: () => {
              pending -= 1;
              if (pending === 0) {
                this.message.success('删除成功');
                this.selection.clear();
                this.getList();
              }
            },
          });
        });
      },
    });
  }
}
