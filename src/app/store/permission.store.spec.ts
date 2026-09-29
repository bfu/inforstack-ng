import { TestBed } from '@angular/core/testing';
import { Route, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { MenuApi } from '@api/menu';
import { RouterVo } from '@core/models/system';
import { UserStore } from './user.store';
import { PermissionStore } from './permission.store';

describe('PermissionStore', () => {
  let resetConfig: ReturnType<typeof vi.fn>;
  let hasPermi: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetConfig = vi.fn();
    hasPermi = vi.fn(() => true);
    TestBed.configureTestingModule({
      providers: [
        PermissionStore,
        { provide: MenuApi, useValue: { getRouters: vi.fn() } },
        { provide: Router, useValue: { config: [], resetConfig } },
        { provide: UserStore, useValue: { hasPermi } },
      ],
    });
  });

  function mockRouters(data: RouterVo[]): void {
    const api = TestBed.inject(MenuApi) as unknown as {
      getRouters: ReturnType<typeof vi.fn>;
    };
    api.getRouters.mockReturnValue(of({ code: 200, msg: 'ok', data }));
  }

  it('reset 清空菜单与生成标记', () => {
    const store = TestBed.inject(PermissionStore);
    store.setSidebarRouters([{ path: '/x', title: 'X' }]);
    store.reset();

    expect(store.sidebarRouters()).toEqual([]);
    expect(store.generated()).toBe(false);
  });

  describe('generateRoutes 菜单树编译', () => {
    it('目录节点（Layout）展开为带空 path 重定向的路由容器', async () => {
      mockRouters([
        {
          path: '/system',
          component: 'Layout',
          meta: { title: '系统管理', icon: 'system' },
          children: [{ path: 'user', component: 'system/user/index', meta: { title: '用户管理' } }],
        },
      ]);
      const store = TestBed.inject(PermissionStore);

      const routes = (await store.generateRoutes().toPromise()) as Route[];

      const systemRoute = routes.find((r) => r.path === 'system');
      expect(systemRoute).toBeDefined();
      expect(systemRoute?.children?.[0]).toMatchObject({
        path: '',
        pathMatch: 'full',
        redirectTo: 'user',
      });
      // 叶子路由使用懒加载组件
      const userRoute = systemRoute?.children?.find((r) => r.path === 'user');
      expect(userRoute?.loadComponent).toBeTypeOf('function');
      expect(userRoute?.data).toMatchObject({ title: '用户管理' });
      expect(store.generated()).toBe(true);
    });

    it('空 children 的 Layout 目录被丢弃', async () => {
      mockRouters([
        { path: '/empty', component: 'Layout', meta: { title: '空目录' }, children: [] },
      ]);
      const store = TestBed.inject(PermissionStore);

      const routes = (await store.generateRoutes().toPromise()) as Route[];

      expect(routes.find((r) => r.path === 'empty')).toBeUndefined();
    });

    it('无法解析组件且无子路由的节点被丢弃', async () => {
      mockRouters([{ path: 'unknown', component: 'not/exists', meta: { title: '未知' } }]);
      const store = TestBed.inject(PermissionStore);

      const routes = (await store.generateRoutes().toPromise()) as Route[];

      expect(routes).toEqual([]);
    });

    it('生成后侧边栏菜单同步构建（hidden 节点剔除）', async () => {
      mockRouters([
        {
          path: '/system',
          component: 'Layout',
          meta: { title: '系统管理' },
          children: [
            { path: 'user', component: 'system/user/index', meta: { title: '用户管理' } },
            {
              path: 'secret',
              component: 'system/notice/index',
              hidden: true,
              meta: { title: '隐藏页' },
            },
          ],
        },
      ]);
      const store = TestBed.inject(PermissionStore);

      await store.generateRoutes().toPromise();

      const titles = JSON.stringify(store.sidebarRouters());
      expect(titles).toContain('系统管理');
      expect(titles).toContain('用户管理');
      expect(titles).not.toContain('隐藏页');
    });

    it('外链菜单：path 保持完整地址且不拼接父级路径', async () => {
      mockRouters([
        {
          path: '/external',
          component: 'Layout',
          meta: { title: '外链' },
          children: [
            {
              path: 'http://ruoyi.vip',
              component: 'InnerLink',
              meta: { title: '若依官网', link: 'http://ruoyi.vip' },
            },
          ],
        },
      ]);
      const store = TestBed.inject(PermissionStore);

      await store.generateRoutes().toPromise();

      const flat = JSON.stringify(store.sidebarRouters());
      expect(flat).toContain('http://ruoyi.vip');
      expect(flat).not.toContain('/http://ruoyi.vip');
    });

    it('挂载路由时重置 Router 配置', async () => {
      mockRouters([{ path: 'user', component: 'system/user/index', meta: { title: '用户管理' } }]);
      const store = TestBed.inject(PermissionStore);

      await store.generateRoutes().toPromise();

      expect(resetConfig).toHaveBeenCalledTimes(1);
    });
  });
});
