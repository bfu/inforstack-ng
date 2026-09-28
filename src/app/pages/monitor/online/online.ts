import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzTableModule, NzTableQueryParams } from 'ng-zorro-antd/table';
import { OnlineApi } from '@api/monitor/online';
import { SysUserOnline } from '@core/models/monitor';
import { parseTime } from '@core/utils/ruoyi';
import { HasPermiDirective } from '@shared/directives/has-permi.directive';
import { TableSelection } from '@shared/utils/table-selection';
import { environment } from '@env/environment';

/**
 * 在线用户，对应 ruoyi-vue3/src/views/monitor/online/index.vue
 * 注意：后端一次返回全部在线会话，分页由 nz-table 前端分页完成
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-online-page',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    HasPermiDirective,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzTableModule,
  ],
  templateUrl: './online.html',
  styleUrl: './online.less',
})
export class OnlinePage implements OnInit {
  private readonly api = inject(OnlineApi);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);

  readonly searchForm = this.fb.nonNullable.group({
    ipaddr: [''],
    userName: [''],
  });

  readonly rows = signal<SysUserOnline[]>([]);
  readonly loading = signal(false);
  readonly pageNum = signal(1);
  readonly pageSize = signal(environment.pageSize);

  /** 表格多选状态（主键为 tokenId 字符串） */
  readonly selection = new TableSelection<SysUserOnline, string>((row) => row.tokenId);

  ngOnInit(): void {
    this.getList();
  }

  getList(): void {
    this.loading.set(true);
    const value = this.searchForm.getRawValue();
    this.api
      .listOnline({ ipaddr: value.ipaddr || undefined, userName: value.userName || undefined })
      .subscribe({
        next: (res) => {
          this.rows.set(res.rows ?? []);
          this.loading.set(false);
          this.selection.refresh(this.rows());
        },
        error: () => this.loading.set(false),
      });
  }

  resetQuery(): void {
    this.searchForm.reset({ ipaddr: '', userName: '' });
    this.pageNum.set(1);
    this.getList();
  }

  onQueryParams(params: NzTableQueryParams): void {
    this.pageNum.set(params.pageIndex);
    this.pageSize.set(params.pageSize);
  }

  /** 登录时间为时间戳，需格式化展示 */
  formatTime(loginTime?: number): string {
    return loginTime ? (parseTime(loginTime) ?? '') : '';
  }

  /** 强退：支持行内单条与工具条批量 */
  forceLogout(row?: SysUserOnline): void {
    let targets: SysUserOnline[];
    if (row) {
      targets = [row];
    } else {
      targets = this.selection.selectedRows(this.rows());
    }
    if (!targets.length) {
      return;
    }
    const names = targets.map((item) => item.userName).join('、');
    this.modal.confirm({
      nzTitle: '系统提示',
      nzContent: `是否确认强退名称为「${names}」的用户？`,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        const tokenIds = targets.map((item) => item.tokenId) as string[];
        this.batchForceLogout(tokenIds);
      },
    });
  }

  private batchForceLogout(tokenIds: string[]): void {
    let completed = 0;
    tokenIds.forEach((tokenId) => {
      this.api.forceLogout(tokenId).subscribe({
        next: () => {
          completed += 1;
          if (completed === tokenIds.length) {
            this.message.success('强退成功');
            this.selection.clear();
            this.getList();
          }
        },
      });
    });
  }
}
