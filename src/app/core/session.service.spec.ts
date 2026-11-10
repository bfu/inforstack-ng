import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { NzModalService } from 'ng-zorro-antd/modal';
import { RuoYiReuseStrategy } from '@core/reuse-strategy';
import { SessionService } from '@core/session.service';
import { setToken } from '@core/utils/auth';
import { PermissionStore } from '@store/permission.store';
import { TagsViewStore } from '@store/tags-view.store';
import { UserStore } from '@store/user.store';

describe('SessionService.resetAll 会话清理', () => {
  let session: SessionService;
  const userMock = { clearSession: vi.fn() };
  const permissionMock = { reset: vi.fn() };
  const tagsMock = { reset: vi.fn() };
  const reuseMock = { clearAll: vi.fn() };
  const modalMock = { closeAll: vi.fn() };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: UserStore, useValue: userMock },
        { provide: PermissionStore, useValue: permissionMock },
        { provide: TagsViewStore, useValue: tagsMock },
        { provide: RuoYiReuseStrategy, useValue: reuseMock },
        { provide: NzModalService, useValue: modalMock },
      ],
    });
    session = TestBed.inject(SessionService);
  });

  it('清理 Token 与全部关联状态（用户/权限/页签/页面缓存）', () => {
    setToken('some-token');

    session.resetAll();

    // Token 被移除：只清状态不清 Token 会导致重登后越权
    expect(localStorage.getItem('Admin-Token')).toBeNull();
    expect(userMock.clearSession).toHaveBeenCalledTimes(1);
    expect(permissionMock.reset).toHaveBeenCalledTimes(1);
    expect(tagsMock.reset).toHaveBeenCalledTimes(1);
    expect(reuseMock.clearAll).toHaveBeenCalledTimes(1);
  });

  it('关闭全部弹窗：弹窗挂在 body 上，不关会残留在跳转后的页面上', () => {
    session.resetAll();

    expect(modalMock.closeAll).toHaveBeenCalledTimes(1);
  });
});
