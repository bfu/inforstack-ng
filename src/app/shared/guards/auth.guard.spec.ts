import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, RouterStateSnapshot } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { isRelogin, SessionExpiredError } from '@core/interceptors/error.interceptor';
import { SessionService } from '@core/session.service';
import { setToken } from '@core/utils/auth';
import { PermissionStore } from '@store/permission.store';
import { UserStore } from '@store/user.store';
import { authGuard } from './auth.guard';

describe('authGuard 登录与动态路由守卫', () => {
  const loginTree = { loginTree: true };
  const targetUrl = { parsedUrl: true };
  const routerMock = {
    createUrlTree: vi.fn(() => loginTree),
    parseUrl: vi.fn(() => targetUrl),
  };
  const userMock = { loaded: vi.fn(), getInfo: vi.fn(), clearSession: vi.fn() };
  const permissionMock = { generateRoutes: vi.fn() };
  const sessionMock = { resetAll: vi.fn() };
  const messageMock = { error: vi.fn() };
  const state = { url: '/system/user' } as unknown as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    isRelogin.show = false;
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: UserStore, useValue: userMock },
        { provide: PermissionStore, useValue: permissionMock },
        { provide: SessionService, useValue: sessionMock },
        { provide: NzMessageService, useValue: messageMock },
      ],
    });
  });

  afterEach(() => {
    isRelogin.show = false;
  });

  it('无 Token：跳转登录页并携带 redirect 参数', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(null as never, state));

    expect(result).toBe(loginTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/system/user' },
    });
  });

  it('已有 Token 且用户信息已加载：直接放行', () => {
    setToken('t');
    userMock.loaded.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard(null as never, state));

    expect(result).toBe(true);
    expect(userMock.getInfo).not.toHaveBeenCalled();
  });

  it('首次进入：拉取用户信息并生成动态路由后导航到目标地址', async () => {
    setToken('t');
    userMock.loaded.mockReturnValue(false);
    userMock.getInfo.mockReturnValue(of({ user: {}, roles: ['admin'], permissions: [] }));
    permissionMock.generateRoutes.mockReturnValue(of([]));

    const result$ = TestBed.runInInjectionContext(() => authGuard(null as never, state));
    const result = await firstValueFrom(result$ as unknown as Observable<typeof targetUrl>);

    expect(result).toBe(targetUrl);
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/system/user');
    expect(permissionMock.generateRoutes).toHaveBeenCalledTimes(1);
  });

  it('拉取失败：全量清理会话、提示错误并跳转登录页', async () => {
    setToken('t');
    userMock.loaded.mockReturnValue(false);
    userMock.getInfo.mockReturnValue(throwError(() => new Error('boom')));

    const result$ = TestBed.runInInjectionContext(() => authGuard(null as never, state));
    const result = await firstValueFrom(result$ as unknown as Observable<typeof loginTree>);

    expect(result).toBe(loginTree);
    expect(sessionMock.resetAll).toHaveBeenCalledTimes(1);
    expect(messageMock.error).toHaveBeenCalledWith('获取用户信息失败，请重新登录');
  });

  it('初始化请求 401：抑制拦截器弹窗，提示会话过期并带 redirect 跳登录', async () => {
    setToken('t');
    userMock.loaded.mockReturnValue(false);
    userMock.getInfo.mockReturnValue(throwError(() => new SessionExpiredError()));

    const result$ = TestBed.runInInjectionContext(() => authGuard(null as never, state));
    // 订阅前即置位：拦截器据此不弹「重新登录」确认框
    expect(isRelogin.show).toBe(true);

    const result = await firstValueFrom(result$ as unknown as Observable<typeof loginTree>);

    expect(result).toBe(loginTree);
    expect(sessionMock.resetAll).toHaveBeenCalledTimes(1);
    expect(messageMock.error).toHaveBeenCalledWith('登录状态已过期，请重新登录');
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/system/user' },
    });
  });

  it('初始化结束后恢复 isRelogin 标志，避免后续 401 永不弹窗', async () => {
    setToken('t');
    userMock.loaded.mockReturnValue(false);
    userMock.getInfo.mockReturnValue(of({ user: {}, roles: ['admin'], permissions: [] }));
    permissionMock.generateRoutes.mockReturnValue(of([]));

    const result$ = TestBed.runInInjectionContext(() => authGuard(null as never, state));
    await firstValueFrom(result$ as unknown as Observable<typeof targetUrl>);

    expect(isRelogin.show).toBe(false);
  });

  it('页面级弹窗已打开时不误清 isRelogin 标志', async () => {
    setToken('t');
    userMock.loaded.mockReturnValue(false);
    userMock.getInfo.mockReturnValue(of({ user: {}, roles: ['admin'], permissions: [] }));
    permissionMock.generateRoutes.mockReturnValue(of([]));
    isRelogin.show = true;

    const result$ = TestBed.runInInjectionContext(() => authGuard(null as never, state));
    await firstValueFrom(result$ as unknown as Observable<typeof targetUrl>);

    expect(isRelogin.show).toBe(true);
  });
});
