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
import { PageQuery } from '@core/models/result';
import { SysRole } from '@core/models/system';
import { parseTime } from '@core/utils/ruoyi';
import { DictStore } from '@store/dict.store';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import { toTreeNodes } from '@shared/utils/tree.util';
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
  readonly menuNodes = signal<NzTreeNodeOptions[]>([]);
  readonly checkedMenuKeys = signal<string[]>([]);

  readonly form = this.fb.group({
    roleId: [undefined as number | undefined],
    roleName: ['', [Validators.required]],
    roleKey: ['', [Validators.required]],
    roleSort: [0, [Validators.required]],
    status: ['0'],
    menuIds: [[] as number[]],
    remark: [''],
  });

  readonly isEdit = computed(() => this.form.controls.roleId.value != null);
  readonly statusOptions = computed(() => this.dictStore.getDict('sys_normal_disable') ?? []);
  readonly dataScopeOptions = computed(() => this.dictStore.getDict('sys_data_scope') ?? []);

  // 数据权限弹窗
  readonly scopeVisible = signal(false);
  readonly scopeSubmitting = signal(false);
  readonly scopeRoleId = signal<number | undefined>(undefined);
  readonly scopeDataScope = signal('1');
  readonly deptNodes = signal<NzTreeNodeOptions[]>([]);
  readonly checkedDeptKeys = signal<string[]>([]);

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
        this.menuNodes.set(toTreeNodes(res.data ?? []));
        this.checkedMenuKeys.set([]);
        this.dialogTitle.set('添加角色');
        this.dialogVisible.set(true);
      },
    });
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
        this.menuNodes.set(toTreeNodes(res.menus ?? []));
        this.checkedMenuKeys.set((res.checkedKeys ?? []).map(String));
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

  onMenuCheck(event: NzFormatEmitEvent): void {
    this.checkedMenuKeys.set(event.keys ?? []);
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
      menuIds: this.checkedMenuKeys().map(Number),
    } as SysRole;
    const request$ = this.isEdit() ? this.api.updateRole(payload) : this.api.addRole(payload);
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
    this.api.deptTree(row.roleId!).subscribe({
      next: (res) => {
        this.deptNodes.set(toTreeNodes(res.depts ?? []));
        this.checkedDeptKeys.set((res.checkedKeys ?? []).map(String));
        this.scopeVisible.set(true);
      },
    });
  }

  onDeptCheck(event: NzFormatEmitEvent): void {
    this.checkedDeptKeys.set(event.keys ?? []);
  }

  submitDataScope(): void {
    const roleId = this.scopeRoleId();
    if (roleId === undefined) {
      return;
    }
    this.scopeSubmitting.set(true);
    this.api
      .dataScope(roleId, this.scopeDataScope(), this.checkedDeptKeys().map(Number))
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
