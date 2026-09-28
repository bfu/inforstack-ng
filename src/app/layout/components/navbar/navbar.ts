import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalService } from 'ng-zorro-antd/modal';
import { SessionService } from '@core/session.service';
import { AppStore } from '@store/app.store';
import { SettingsStore } from '@store/settings.store';
import { UserStore } from '@store/user.store';

/**
 * 顶栏：折叠按钮、面包屑、全屏、用户下拉
 * 对应 ruoyi-vue3/src/layout/components/Navbar.vue
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-navbar',
  imports: [NzIconModule, NzMenuModule, NzDropdownModule, NzAvatarModule, NzBreadCrumbModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.less',
})
export class Navbar {
  private readonly router = inject(Router);
  private readonly modal = inject(NzModalService);

  readonly app = inject(AppStore);
  readonly settings = inject(SettingsStore);
  readonly store = inject(UserStore);
  private readonly session = inject(SessionService);

  readonly breadcrumbs = signal<string[]>([]);
  readonly initial = computed(() =>
    (this.store.nickName() || this.store.name() || 'U').slice(0, 1),
  );

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() =>
        this.breadcrumbs.set(this.buildBreadcrumb(this.router.routerState.snapshot.root)),
      );
  }

  private buildBreadcrumb(root: ActivatedRouteSnapshot): string[] {
    const titles: string[] = [];
    let node: ActivatedRouteSnapshot | null = root;
    while (node) {
      const title = node.data?.['title'] as string | undefined;
      if (title) {
        titles.push(title);
      }
      node = node.firstChild ?? null;
    }
    return titles;
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }

  logout(): void {
    this.modal.confirm({
      nzTitle: '提示',
      nzContent: '确定注销并退出系统吗？',
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOnOk: () => {
        this.store.logOut().subscribe({
          next: () => this.finishLogout(),
          // 后端退出接口失败时同样要保证本地会话态被清空
          error: () => this.finishLogout(),
        });
      },
    });
  }

  /** 清理会话态并跳转登录页，与 401 过期共用同一套清理逻辑 */
  private finishLogout(): void {
    this.session.resetAll();
    void this.router.navigate(['/login']);
  }
}
