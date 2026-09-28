import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { RoleApi } from '@api/system/role';
import { PageQuery } from '@core/models/result';
import { SysRole, SysUser } from '@core/models/system';
import { environment } from '@env/environment';

/** 分配用户，对应 ruoyi-vue3/src/views/system/role/authUser.vue */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-role-auth-user',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzDescriptionsModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzTableModule,
  ],
  templateUrl: './auth-user.html',
  styleUrl: './auth-user.less',
})
export class RoleAuthUser implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(RoleApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);

  readonly role = signal<SysRole>({});
  readonly allocated = signal<SysUser[]>([]);
  readonly unallocated = signal<SysUser[]>([]);
  readonly allocatedTotal = signal(0);
  readonly unallocatedTotal = signal(0);
  readonly loading = signal(false);

  readonly allocatedChecked = signal<Set<number>>(new Set());
  readonly unallocatedChecked = signal<Set<number>>(new Set());

  readonly searchForm = this.fb.nonNullable.group({
    userName: [''],
    phonenumber: [''],
  });

  readonly pageNum = signal(1);
  readonly pageSize = signal(environment.pageSize);
  readonly unPageNum = signal(1);
  readonly unPageSize = signal(environment.pageSize);

  private roleId = 0;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('roleId');
    if (id) {
      this.roleId = Number(id);
      this.api.getRole(this.roleId).subscribe({
        next: (res) => this.role.set(res.data ?? {}),
      });
      this.loadAllocated();
      this.loadUnallocated();
    }
  }

  private searchQuery(): Partial<PageQuery> {
    const value = this.searchForm.getRawValue();
    return {
      roleId: this.roleId,
      userName: value.userName || undefined,
      phonenumber: value.phonenumber || undefined,
    };
  }

  loadAllocated(): void {
    this.loading.set(true);
    this.api
      .allocatedList({ ...this.searchQuery(), pageNum: this.pageNum(), pageSize: this.pageSize() })
      .subscribe({
        next: (res) => {
          this.allocated.set(res.rows ?? []);
          this.allocatedTotal.set(res.total ?? 0);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  loadUnallocated(): void {
    this.loading.set(true);
    this.api
      .unallocatedList({
        ...this.searchQuery(),
        pageNum: this.unPageNum(),
        pageSize: this.unPageSize(),
      })
      .subscribe({
        next: (res) => {
          this.unallocated.set(res.rows ?? []);
          this.unallocatedTotal.set(res.total ?? 0);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  onAllocatedParams(params: NzTableQueryParams): void {
    this.pageNum.set(params.pageIndex);
    this.pageSize.set(params.pageSize);
    this.loadAllocated();
  }

  onUnallocatedParams(params: NzTableQueryParams): void {
    this.unPageNum.set(params.pageIndex);
    this.unPageSize.set(params.pageSize);
    this.loadUnallocated();
  }

  search(): void {
    this.pageNum.set(1);
    this.unPageNum.set(1);
    this.loadAllocated();
    this.loadUnallocated();
  }

  resetQuery(): void {
    this.searchForm.reset({ userName: '', phonenumber: '' });
    this.search();
  }

  onChecked(
    target: 'allocated' | 'unallocated',
    userId: number | undefined,
    checked: boolean,
  ): void {
    if (userId === undefined) {
      return;
    }
    const store = target === 'allocated' ? this.allocatedChecked : this.unallocatedChecked;
    const ids = new Set(store());
    if (checked) {
      ids.add(userId);
    } else {
      ids.delete(userId);
    }
    store.set(ids);
  }

  /** 批量取消授权 */
  cancelAll(): void {
    const ids = Array.from(this.allocatedChecked());
    if (!ids.length) {
      return;
    }
    this.confirmCancel(ids.join(','));
  }

  cancelOne(row: SysUser): void {
    this.confirmCancel(String(row.userId));
  }

  private confirmCancel(userIds: string): void {
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: '是否确认取消该用户的角色授权？',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOnOk: () => {
        this.api.authUserCancelAll(this.roleId, userIds).subscribe({
          next: () => {
            this.message.success('取消授权成功');
            this.allocatedChecked.set(new Set());
            this.loadAllocated();
            this.loadUnallocated();
          },
        });
      },
    });
  }

  /** 批量添加授权 */
  selectAll(): void {
    const ids = Array.from(this.unallocatedChecked());
    if (!ids.length) {
      return;
    }
    this.api.authUserSelectAll(this.roleId, ids.join(',')).subscribe({
      next: () => {
        this.message.success('授权成功');
        this.unallocatedChecked.set(new Set());
        this.loadAllocated();
        this.loadUnallocated();
      },
    });
  }

  selectOne(row: SysUser): void {
    this.api.authUserSelectAll(this.roleId, String(row.userId)).subscribe({
      next: () => {
        this.message.success('授权成功');
        this.loadAllocated();
        this.loadUnallocated();
      },
    });
  }

  close(): void {
    void this.router.navigate(['/system/role']);
  }
}
