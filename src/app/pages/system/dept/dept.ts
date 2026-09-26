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
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTreeSelectModule } from 'ng-zorro-antd/tree-select';
import { NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { DeptApi } from '@api/system/dept';
import { SysDept } from '@core/models/system';
import { DictStore } from '@store/dict.store';
import { DictTag } from '@shared/components/dict-tag/dict-tag';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import { TableSelection } from '@shared/utils/table-selection';

interface DeptRow extends SysDept {
  level: number;
}

/** 部门管理，对应 ruoyi-vue3/src/views/system/dept/index.vue */
@Component({
  selector: 'app-dept-page',
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
    NzTreeSelectModule,
  ],
  templateUrl: './dept.html',
  styleUrl: './dept.less',
})
export class DeptPage implements OnInit {
  private readonly api = inject(DeptApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly dictStore = inject(DictStore);

  readonly searchForm = this.fb.nonNullable.group({
    deptName: [''],
    status: [''],
  });

  readonly deptTree = signal<SysDept[]>([]);
  readonly expandedIds = signal<Set<number>>(new Set());
  readonly loading = signal(false);
  /** 表格多选状态 */
  readonly selection = new TableSelection<SysDept, number>((row) => row.deptId);

  readonly flatRows = computed<DeptRow[]>(() => {
    const rows: DeptRow[] = [];
    const walk = (nodes: SysDept[], level: number) => {
      for (const node of nodes) {
        rows.push({ ...node, level });
        if (node.children?.length && node.deptId !== undefined && this.expandedIds().has(node.deptId)) {
          walk(node.children as SysDept[], level + 1);
        }
      }
    };
    walk(this.deptTree(), 0);
    return rows;
  });

  readonly allExpanded = computed(() => {
    const total = this.countNodes(this.deptTree());
    return total > 0 && this.expandedIds().size >= total;
  });

  readonly dialogVisible = signal(false);
  readonly dialogTitle = signal('');
  readonly submitting = signal(false);
  readonly parentOptions = signal<NzTreeNodeOptions[]>([]);

  readonly form = this.fb.group({
    deptId: [undefined as number | undefined],
    parentId: [0],
    deptName: ['', [Validators.required]],
    orderNum: [0, [Validators.required]],
    leader: [''],
    phone: ['', [Validators.pattern(/^1[3|4|5|6|7|8|9][0-9]\d{8}$/)]],
    email: ['', [Validators.email]],
    status: ['0'],
  });

  readonly isEdit = computed(() => this.form.controls.deptId.value !== undefined);
  readonly statusOptions = computed(() => this.dictStore.getDict('sys_normal_disable') ?? []);

  ngOnInit(): void {
    if (!this.dictStore.getDict('sys_normal_disable')) {
      this.dictStore.loadDict('sys_normal_disable').subscribe();
    }
    this.getList();
  }

  private countNodes(nodes: SysDept[]): number {
    return nodes.reduce((sum, node) => sum + 1 + this.countNodes((node.children ?? []) as SysDept[]), 0);
  }

  private buildTree(list: SysDept[]): SysDept[] {
    const map = new Map<number, SysDept>();
    list.forEach((item) => map.set(item.deptId!, { ...item, children: [] }));
    const roots: SysDept[] = [];
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
    this.api.listDept({ deptName: value.deptName || undefined, status: value.status || undefined }).subscribe({
      next: (res) => {
        const tree = this.buildTree(res.data ?? []);
        this.deptTree.set(tree);
        if (!this.expandedIds().size) {
          this.expandedIds.set(new Set(tree.map((item) => item.deptId!)));
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resetQuery(): void {
    this.searchForm.reset({ deptName: '', status: '' });
    this.getList();
  }

  toggleExpandAll(): void {
    if (this.allExpanded()) {
      this.expandedIds.set(new Set());
    } else {
      const ids = new Set<number>();
      const walk = (nodes: SysDept[]) => {
        nodes.forEach((node) => {
          if (node.deptId !== undefined) {
            ids.add(node.deptId);
          }
          walk((node.children ?? []) as SysDept[]);
        });
      };
      walk(this.deptTree());
      this.expandedIds.set(ids);
    }
  }

  toggleRow(row: DeptRow): void {
    if (!row.children?.length || row.deptId === undefined) {
      return;
    }
    const ids = new Set(this.expandedIds());
    if (ids.has(row.deptId)) {
      ids.delete(row.deptId);
    } else {
      ids.add(row.deptId);
    }
    this.expandedIds.set(ids);
  }

  selectedRows(): SysDept[] {
    const result: SysDept[] = [];
    const walk = (nodes: SysDept[]) => {
      nodes.forEach((node) => {
        if (this.selection.hasKey(node.deptId)) {
          result.push(node);
        }
        walk((node.children ?? []) as SysDept[]);
      });
    };
    walk(this.deptTree());
    return result;
  }

  private loadParentOptions(currentId?: number): void {
    this.api.treeselect(currentId).subscribe({
      next: (res) => {
        const nodes = this.toDeptNodes(this.buildTree(res.data ?? []));
        this.parentOptions.set([
          { title: '顶级部门', key: '0', isLeaf: true, children: nodes.length ? nodes : undefined },
        ]);
      },
    });
  }

  /** 部门树 → ng-zorro 树节点 */
  private toDeptNodes(nodes: SysDept[]): NzTreeNodeOptions[] {
    return nodes.map((node) => ({
      title: node.deptName ?? '',
      key: String(node.deptId),
      isLeaf: !node.children?.length,
      children: node.children?.length ? this.toDeptNodes(node.children) : undefined,
    }));
  }

  openAdd(parentId?: number): void {
    this.resetForm();
    if (parentId !== undefined) {
      this.form.patchValue({ parentId });
    }
    this.loadParentOptions();
    this.dialogTitle.set('添加部门');
    this.dialogVisible.set(true);
  }

  openEdit(row: SysDept): void {
    this.resetForm();
    this.form.patchValue({
      deptId: row.deptId,
      parentId: row.parentId ?? 0,
      deptName: row.deptName ?? '',
      orderNum: row.orderNum ?? 0,
      leader: row.leader ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      status: row.status ?? '0',
    });
    this.loadParentOptions(row.deptId);
    this.dialogTitle.set('修改部门');
    this.dialogVisible.set(true);
  }

  private resetForm(): void {
    this.form.reset({
      deptId: undefined,
      parentId: 0,
      deptName: '',
      orderNum: 0,
      leader: '',
      phone: '',
      email: '',
      status: '0',
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
    const payload = this.form.getRawValue() as SysDept;
    const request$ = this.isEdit() ? this.api.updateDept(payload) : this.api.addDept(payload);
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

  delete(row?: SysDept): void {
    const targets = row ? [row] : this.selectedRows();
    if (!targets.length) {
      return;
    }
    const names = targets.map((item) => item.deptName).join('、');
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认删除名称为「${names}」的数据项？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        let pending = targets.length;
        targets.forEach((item) => {
          this.api.delDept(item.deptId!).subscribe({
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
