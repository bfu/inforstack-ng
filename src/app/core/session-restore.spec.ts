import { TestBed } from '@angular/core/testing';
import { NzMessageService } from 'ng-zorro-antd/message';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { isRelogin, SessionExpiredError } from '@core/interceptors/error.interceptor';
import { SessionService } from '@core/session.service';
import { restoreSession } from '@core/session-restore';
import { removeToken, setToken } from '@core/utils/auth';
import { PermissionStore } from '@store/permission.store';
import { UserStore } from '@store/user.store';

describe('restoreSession 刷新恢复', () => {
  const userMock = { getInfo: vi.fn(() => of({})) };
  const permissionMock = { generateRoutes: vi.fn(() => of([])) };
  const sessionMock = { resetAll: vi.fn() };
  const messageMock = { error: vi.fn() };

  /** 在注入上下文中执行，等同应用启动（含刷新）时的恢复流程 */
  function restore(): Promise<unknown> | void {
    return TestBed.runInInjectionContext(() => restoreSession());
  }

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    userMock.getInfo.mockReturnValue(of({}));
    permissionMock.generateRoutes.mockReturnValue(of([]));
    isRelogin.show = false;

    TestBed.configureTestingModule({
      providers: [
        { provide: UserStore, useValue: userMock },
        { provide: PermissionStore, useValue: permissionMock },
        { provide: SessionService, useValue: sessionMock },
        { provide: NzMessageService, useValue: messageMock },
      ],
    });
  });

  it('已登录时恢复用户信息并注入动态路由', async () => {
    setToken('some-token');

    await restore();

    expect(userMock.getInfo).toHaveBeenCalledTimes(1);
    expect(permissionMock.generateRoutes).toHaveBeenCalledTimes(1);
  });

  it('未登录时跳过恢复，不发起任何请求', async () => {
    removeToken();

    await restore();

    expect(userMock.getInfo).not.toHaveBeenCalled();
    expect(permissionMock.generateRoutes).not.toHaveBeenCalled();
  });

  it('会话过期时清理会话并吞掉错误，避免应用启动失败', async () => {
    setToken('expired-token');
    userMock.getInfo.mockReturnValue(throwError(() => new SessionExpiredError()));

    // 错误被吞掉：Promise 正常 resolve（否则 runInitializers 会 reject，应用起不来）
    await expect(restore()).resolves.toBeNull();

    expect(sessionMock.resetAll).toHaveBeenCalledTimes(1);
    expect(messageMock.error).toHaveBeenCalledTimes(1);
    expect(permissionMock.generateRoutes).not.toHaveBeenCalled();
  });

  it('恢复期间抑制 401 重登弹窗，结束后还原标志位', async () => {
    setToken('some-token');

    await restore();

    expect(isRelogin.show).toBe(false);
  });
});
