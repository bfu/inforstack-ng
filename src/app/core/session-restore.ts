import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, finalize, firstValueFrom, of, switchMap } from 'rxjs';
import { isRelogin, SessionExpiredError } from '@core/interceptors/error.interceptor';
import { SessionService } from '@core/session.service';
import { getToken } from '@core/utils/auth';
import { PermissionStore } from '@store/permission.store';
import { UserStore } from '@store/user.store';

/**
 * 刷新（深链）恢复：在初始导航之前补齐用户信息与动态路由
 *
 * Angular 的 canActivate 在「路由匹配之后」执行，而根级 `{ path: '**', redirectTo: '404' }`
 * 的重定向在匹配阶段就已生效 —— 直接刷新 /system/user 时，路由表仍只有常量路由，
 * 请求命中兜底通配被重定向到 /404，authGuard 根本不会被调用，动态路由也就无从注入。
 *
 * 因此恢复动作必须前移到初始导航之前：APP_INITIALIZER 在 bootstrap 之前执行，
 * Router 的初始导航在其之后，时序上正好合适。
 * 对应 ruoyi-vue3/src/permission.js 中「同步等待 getInfo + generateRoutes 再放行」的前置守卫。
 */
export function restoreSession(): Promise<unknown> | void {
  if (!getToken()) {
    return;
  }

  const user = inject(UserStore);
  const permission = inject(PermissionStore);
  const session = inject(SessionService);
  const message = inject(NzMessageService);

  // 与 authGuard 一致：初始化请求期间抑制 401 的「重新登录」弹窗，
  // 由本处的 catchError 统一决定是否跳转登录页，避免弹窗还没点就已被跳走
  const reloginShown = isRelogin.show;
  isRelogin.show = true;

  return firstValueFrom(
    user.getInfo().pipe(
      switchMap(() => permission.generateRoutes()),
      finalize(() => (isRelogin.show = reloginShown)),
      catchError((err: unknown) => {
        console.error('恢复会话/动态路由失败:', err);
        // 全量清理会话态：只清 Token 会残留动态路由与权限，重登后沿用旧账号菜单（越权）
        session.resetAll();
        message.error(
          err instanceof SessionExpiredError
            ? '登录状态已过期，请重新登录'
            : '获取用户信息失败，请重新登录',
        );
        // 必须吞掉错误：Observable 报错会让 runInitializers() reject，整个应用起不来。
        // 清理后初始导航由 authGuard 判定为未登录，跳转 /login?redirect=<原地址>
        return of(null);
      }),
    ),
  );
}

export function provideSessionRestore(): EnvironmentProviders {
  return provideAppInitializer(() => restoreSession());
}
