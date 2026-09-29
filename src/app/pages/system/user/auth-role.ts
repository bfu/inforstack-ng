import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTableModule } from 'ng-zorro-antd/table';
import { UserApi } from '@api/system/user';
import { SysRole, SysUser } from '@core/models/system';
import { TableSelection } from '@shared/utils/table-selection';

/** 分配角色，对应 ruoyi-vue3/src/views/system/user/authRole.vue */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-user-auth-role',
  imports: [
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzDescriptionsModule,
    NzTableModule,
  ],
  templateUrl: './auth-role.html',
  styleUrl: './auth-role.less',
})
export class UserAuthRole implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(UserApi);
  private readonly message = inject(NzMessageService);

  readonly user = signal<SysUser>({});
  readonly roles = signal<SysRole[]>([]);
  /** 角色勾选状态 */
  readonly selection = new TableSelection<SysRole, number>((row) => row.roleId);
  readonly loading = signal(false);
  readonly submitting = signal(false);

  private userId = '';

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId') ?? '';
    if (!this.userId) {
      return;
    }
    this.loading.set(true);
    this.api.getAuthRole(this.userId).subscribe({
      next: (res) => {
        this.user.set(res.user ?? {});
        this.roles.set(res.roles ?? []);
        this.selection.clear();
        (res.roles ?? []).forEach((role) => {
          if (role.flag) {
            this.selection.onItemChecked(role.roleId, true);
          }
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  submit(): void {
    const ids = this.selection.selectedKeys().join(',');
    this.submitting.set(true);
    this.api.updateAuthRole(this.userId, ids).subscribe({
      next: () => {
        this.message.success('授权成功');
        this.submitting.set(false);
        void this.router.navigate(['/system/user']);
      },
      error: () => this.submitting.set(false),
    });
  }

  close(): void {
    void this.router.navigate(['/system/user']);
  }
}
