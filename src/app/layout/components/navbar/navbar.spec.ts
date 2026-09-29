import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { NzModalService } from 'ng-zorro-antd/modal';
import { SessionService } from '@core/session.service';
import { UserStore } from '@store/user.store';
import { Navbar } from './navbar';

type Mock = ReturnType<typeof vi.fn>;

describe('Navbar 顶栏', () => {
  let events: Subject<unknown>;
  let navigate: Mock;
  let logOut: Mock;
  let resetAll: Mock;
  let confirm: Mock;
  let snapshot: { data?: Record<string, string>; firstChild?: unknown };

  beforeEach(() => {
    events = new Subject<unknown>();
    navigate = vi.fn(() => Promise.resolve(true));
    logOut = vi.fn(() => of({ code: 200, msg: '' }));
    resetAll = vi.fn();
    confirm = vi.fn((config: { nzOnOk?: () => void }) => config.nzOnOk?.());
    snapshot = { data: {}, firstChild: null };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            events: events.asObservable(),
            navigate,
            url: '/index',
            get routerState() {
              return { snapshot: { root: snapshot } };
            },
          },
        },
        { provide: NzModalService, useValue: { confirm, create: vi.fn() } },
        {
          provide: UserStore,
          useValue: {
            nickName: vi.fn(() => '若依'),
            name: vi.fn(() => 'ry'),
            avatar: vi.fn(() => ''),
            logOut,
            clearSession: vi.fn(),
            hasPermi: vi.fn(() => true),
            hasRole: vi.fn(() => true),
          },
        },
        { provide: SessionService, useValue: { resetAll } },
      ],
    });
  });

  function create(): Navbar {
    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('头像首字母取昵称首字', () => {
    const navbar = create();

    expect(navbar.initial()).toBe('若');
  });

  it('导航结束后按路由 data.title 生成面包屑', () => {
    const navbar = create();
    snapshot = {
      data: { title: '系统管理' },
      firstChild: { data: { title: '用户管理' }, firstChild: null },
    };

    events.next(new NavigationEnd(1, '/system/user', '/system/user'));

    expect(navbar.breadcrumbs()).toEqual(['系统管理', '用户管理']);
  });

  describe('toggleFullscreen', () => {
    it('未全屏时请求全屏', () => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
      const request = vi.fn(() => Promise.resolve());
      Object.defineProperty(document.documentElement, 'requestFullscreen', {
        configurable: true,
        value: request,
      });
      const navbar = create();

      navbar.toggleFullscreen();

      expect(request).toHaveBeenCalledTimes(1);
    });

    it('已全屏时退出全屏', () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: document.documentElement,
      });
      const exit = vi.fn(() => Promise.resolve());
      Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
      const navbar = create();

      navbar.toggleFullscreen();

      expect(exit).toHaveBeenCalledTimes(1);
    });
  });

  it('退出登录：确认后清理会话并跳登录页', () => {
    const navbar = create();

    navbar.logout();

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(logOut).toHaveBeenCalledTimes(1);
    expect(resetAll).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('退出接口失败时同样清理会话并跳转', () => {
    logOut.mockReturnValue(throwError(() => new Error('boom')));
    const navbar = create();

    navbar.logout();

    expect(resetAll).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
