import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, map, of, switchMap } from 'rxjs';
import { isRelogin, SessionExpiredError } from '@core/interceptors/error.interceptor';
import { SessionService } from '@core/session.service';
import { getToken } from '@core/utils/auth';
import { PermissionStore } from '@store/permission.store';
import { UserStore } from '@store/user.store';

/**
 * 登录与动态路由守卫
 * 对应 ruoyi-vue3/src/permission.js 的前置守卫
 *
 * 首次进入时拉取用户信息 → 生成动态路由 → 重新导航到目标地址
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const user = inject(UserStore);
  const permission = inject(PermissionStore);
  const session = inject(SessionService);
  const message = inject(NzMessageService);

  if (!getToken()) {
    return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
  }

  if (user.loaded()) {
    return true;
  }

  // 初始化请求由守卫独占处置：先置位 isRelogin 抑制拦截器的「重新登录」弹窗，
  // 否则弹窗还没等用户点确认，守卫就已经跳转到登录页（弹窗残留、选择权被剥夺）。
  // 对应 ruoyi-vue3/src/permission.js 中调用 getInfo 前的 isRelogin.show = true
  const reloginShown = isRelogin.show;
  isRelogin.show = true;

  return user.getInfo().pipe(
    switchMap(() => permission.generateRoutes()),
    map(() => {
      isRelogin.show = reloginShown;
      return router.parseUrl(state.url);
    }),
    catchError((err) => {
      isRelogin.show = reloginShown;
      console.error('加载用户信息/动态路由失败:', err);
      // 全量清理会话态：只清用户信息会残留动态路由/页签/页面缓存，重新登录后沿用上一个账号的菜单与权限
      session.resetAll();
      message.error(
        err instanceof SessionExpiredError
          ? '登录状态已过期，请重新登录'
          : '获取用户信息失败，请重新登录',
      );
      return of(router.createUrlTree(['/login'], { queryParams: { redirect: state.url } }));
    }),
  );
};
