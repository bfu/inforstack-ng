import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { LoginApi, LoginBody, UserInfoResult } from '@api/login';
import { NzMessageService } from 'ng-zorro-antd/message';
import { UserStore } from './user.store';

describe('UserStore', () => {
  let apiMock: {
    login: ReturnType<typeof vi.fn>;
    getInfo: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let messageMock: { warning: ReturnType<typeof vi.fn> };
  let store: UserStore;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    apiMock = {
      login: vi.fn(),
      getInfo: vi.fn(),
      logout: vi.fn(),
    };
    messageMock = { warning: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        UserStore,
        { provide: LoginApi, useValue: apiMock },
        { provide: NzMessageService, useValue: messageMock },
      ],
    });
    store = TestBed.inject(UserStore);
  });

  function makeInfo(overrides: Partial<UserInfoResult>): UserInfoResult {
    return {
      code: 200,
      msg: 'ok',
      user: {
        userId: 1,
        userName: 'admin',
        nickName: '管理员',
        avatar: '/profile/avatar.png',
      } as UserInfoResult['user'],
      roles: ['admin'],
      permissions: ['*:*:*'],
      pwdChrtype: '1',
      isDefaultModifyPwd: false,
      isPasswordExpired: false,
      ...overrides,
    };
  }

  describe('login', () => {
    it('成功后写入 Token 信号与 localStorage', () => {
      apiMock.login.mockReturnValue(of({ code: 200, msg: 'ok', token: 'jwt-token' }));

      store.login({ username: 'a', password: 'b', code: 'c', uuid: 'u' } as LoginBody).subscribe();

      expect(store.token()).toBe('jwt-token');
      expect(localStorage.getItem('Admin-Token')).toBe('jwt-token');
    });
  });

  describe('getInfo', () => {
    it('映射用户信息：相对 avatar 拼接 apiBaseUrl 前缀', () => {
      apiMock.getInfo.mockReturnValue(of(makeInfo({})));

      store.getInfo().subscribe();

      expect(store.id()).toBe(1);
      expect(store.name()).toBe('admin');
      expect(store.nickName()).toBe('管理员');
      // 开发环境 apiBaseUrl 为 /dev-api
      expect(store.avatar()).toBe('/dev-api/profile/avatar.png');
      expect(store.loaded()).toBe(true);
      expect(sessionStorage.getItem('pwrChrtype')).toBe('1');
    });

    it('http 开头的 avatar 不拼接前缀', () => {
      apiMock.getInfo.mockReturnValue(
        of(
          makeInfo({
            user: { userId: 2, userName: 'b', nickName: 'b', avatar: 'https://cdn/x.png' } as never,
          }),
        ),
      );

      store.getInfo().subscribe();

      expect(store.avatar()).toBe('https://cdn/x.png');
    });

    it('roles 为空时回退 ROLE_DEFAULT', () => {
      apiMock.getInfo.mockReturnValue(of(makeInfo({ roles: [], permissions: [] })));

      store.getInfo().subscribe();

      expect(store.roles()).toEqual(['ROLE_DEFAULT']);
      expect(store.loaded()).toBe(true);
    });

    it('isDefaultModifyPwd 时提示修改初始密码', () => {
      apiMock.getInfo.mockReturnValue(of(makeInfo({ isDefaultModifyPwd: true })));

      store.getInfo().subscribe();

      expect(messageMock.warning).toHaveBeenCalledWith('您的密码还是初始密码，请修改密码！', {
        nzDuration: 6000,
      });
    });

    it('isPasswordExpired 时提示密码过期', () => {
      apiMock.getInfo.mockReturnValue(of(makeInfo({ isPasswordExpired: true })));

      store.getInfo().subscribe();

      expect(messageMock.warning).toHaveBeenCalledWith('您的密码已过期，请尽快修改密码！', {
        nzDuration: 6000,
      });
    });
  });

  describe('logOut / clearSession', () => {
    it('logOut 成功后清理会话', () => {
      localStorage.setItem('Admin-Token', 't');
      apiMock.logout.mockReturnValue(of({ code: 200, msg: 'ok' }));

      store.logOut().subscribe();

      expect(store.token()).toBe('');
      expect(localStorage.getItem('Admin-Token')).toBeNull();
      expect(store.loaded()).toBe(false);
    });

    it('clearSession 重置全部信号', () => {
      apiMock.getInfo.mockReturnValue(of(makeInfo({ roles: ['admin'], permissions: ['*:*:*'] })));
      store.getInfo().subscribe();

      store.clearSession();

      expect(store.id()).toBeNull();
      expect(store.name()).toBe('');
      expect(store.roles()).toEqual([]);
      expect(store.permissions()).toEqual([]);
      expect(store.loaded()).toBe(false);
    });
  });

  describe('hasPermi / hasRole 通配', () => {
    it('*:*:* 超管权限通过任意校验', () => {
      apiMock.getInfo.mockReturnValue(of(makeInfo({ permissions: ['*:*:*'] })));
      store.getInfo().subscribe();

      expect(store.hasPermi('system:user:add')).toBe(true);
      expect(store.hasPermi('anything:at:all')).toBe(true);
    });

    it('普通权限精确匹配', () => {
      apiMock.getInfo.mockReturnValue(of(makeInfo({ permissions: ['system:user:add'] })));
      store.getInfo().subscribe();

      expect(store.hasPermi('system:user:add')).toBe(true);
      expect(store.hasPermi('system:user:remove')).toBe(false);
    });

    it('admin 角色通过任意角色校验', () => {
      apiMock.getInfo.mockReturnValue(of(makeInfo({ roles: ['admin'], permissions: [] })));
      store.getInfo().subscribe();

      expect(store.hasRole('whatever')).toBe(true);
    });

    it('hasPermiOr / hasRoleOr 任一满足', () => {
      apiMock.getInfo.mockReturnValue(of(makeInfo({ roles: ['common'], permissions: ['a:b:c'] })));
      store.getInfo().subscribe();

      expect(store.hasPermiOr(['x:y:z', 'a:b:c'])).toBe(true);
      expect(store.hasPermiOr(['x:y:z'])).toBe(false);
      expect(store.hasRoleOr(['common', 'other'])).toBe(true);
      expect(store.hasRoleOr(['other'])).toBe(false);
    });
  });
});
