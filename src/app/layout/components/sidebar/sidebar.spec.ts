import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { AppStore } from '@store/app.store';
import { PermissionStore } from '@store/permission.store';
import { SettingsStore } from '@store/settings.store';
import { Sidebar } from './sidebar';

describe('Sidebar 侧边栏', () => {
  let events: Subject<unknown>;
  let sidebarOpened: ReturnType<typeof vi.fn>;
  let snapshot: { data?: Record<string, string>; firstChild?: unknown };

  beforeEach(() => {
    events = new Subject<unknown>();
    sidebarOpened = vi.fn(() => true);
    snapshot = { data: {}, firstChild: null };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            events: events.asObservable(),
            navigate: vi.fn(),
            url: '/index',
            get routerState() {
              return { snapshot: { root: snapshot } };
            },
          },
        },
        { provide: AppStore, useValue: { sidebarOpened } },
        { provide: PermissionStore, useValue: { sidebarRouters: vi.fn(() => []) } },
      ],
    });
  });

  function create(): Sidebar {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('侧边栏展开时不折叠，缩进按层级累加', () => {
    const sidebar = create();

    expect(sidebar.collapsed()).toBe(false);
    expect(sidebar.paddingOf(2)).toBe(48);
  });

  it('折叠态缩进归零', () => {
    sidebarOpened.mockReturnValue(false);
    const sidebar = create();

    expect(sidebar.collapsed()).toBe(true);
    expect(sidebar.paddingOf(2)).toBe(0);
  });

  it('侧栏主题随设置切换明暗', () => {
    const sidebar = create();
    const settings = TestBed.inject(SettingsStore);

    expect(sidebar.menuTheme()).toBe(settings.sideTheme() === 'theme-light' ? 'light' : 'dark');

    settings.changeSetting('sideTheme', 'theme-light');
    expect(sidebar.menuTheme()).toBe('light');

    settings.changeSetting('sideTheme', 'theme-dark');
    expect(sidebar.menuTheme()).toBe('dark');
  });

  it('外链菜单单独判定', () => {
    const sidebar = create();

    expect(sidebar.isExternalLink('https://doc.ruoyi.vip')).toBe(true);
    expect(sidebar.isExternalLink('/system/user')).toBe(false);
  });

  it('导航结束后读取路由声明的 activeMenu 作为高亮菜单', () => {
    const sidebar = create();
    snapshot = {
      data: { activeMenu: '/system/user' },
      firstChild: { data: {}, firstChild: null },
    };

    events.next(new NavigationEnd(1, '/system/user-auth/role/1', '/system/user-auth/role/1'));

    expect(sidebar.activeMenuPath()).toBe('/system/user');
    expect(sidebar.isActiveMenu('/system/user')).toBe(true);
    expect(sidebar.isActiveMenu('/system/role')).toBe(false);
    expect(sidebar.isActiveMenu('https://doc.ruoyi.vip')).toBe(false);
  });

  it('asNodes 空值兜底为数组', () => {
    const sidebar = create();

    expect(sidebar.asNodes(undefined)).toEqual([]);
  });
});
