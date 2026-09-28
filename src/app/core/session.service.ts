import { Injectable, inject } from '@angular/core';
import { RuoYiReuseStrategy } from '@core/reuse-strategy';
import { removeToken } from '@core/utils/auth';
import { PermissionStore } from '@store/permission.store';
import { TagsViewStore } from '@store/tags-view.store';
import { UserStore } from '@store/user.store';

/**
 * 会话生命周期协调器
 *
 * 401 会话过期与主动登出必须走同一套清理逻辑。若只清 Token，
 * UserStore 的角色/权限信号、PermissionStore 的动态路由、TagsViewStore 的页签
 * 以及 RuoYiReuseStrategy 的组件实例都会残留，导致重新登录后
 * authGuard 命中 user.loaded() 直接放行，沿用上一个账号的菜单与权限（越权）。
 *
 * 不把 resetAll 放进 UserStore：PermissionStore 已注入 UserStore，
 * 反向注入会形成循环依赖，故由本服务统一编排。
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly user = inject(UserStore);
  private readonly permission = inject(PermissionStore);
  private readonly tags = inject(TagsViewStore);
  private readonly reuse = inject(RuoYiReuseStrategy);

  /** 清理全部会话态：Token、用户信息与权限、动态路由、页签、页面缓存 */
  resetAll(): void {
    removeToken();
    this.user.clearSession();
    this.permission.reset();
    this.tags.reset();
    this.reuse.clearAll();
  }
}
