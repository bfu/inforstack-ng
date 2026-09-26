import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, map, of, switchMap } from 'rxjs';
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
  const message = inject(NzMessageService);

  if (!getToken()) {
    return router.createUrlTree(['/login'], { queryParams: { redirect: state.url } });
  }

  if (user.loaded()) {
    return true;
  }

  return user.getInfo().pipe(
    switchMap(() => permission.generateRoutes()),
    map(() => router.parseUrl(state.url)),
    catchError((err) => {
      console.error('加载用户信息/动态路由失败:', err);
      user.clearSession();
      message.error('获取用户信息失败，请重新登录');
      return of(router.createUrlTree(['/login']));
    }),
  );
};
