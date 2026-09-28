import { Injectable, inject, signal } from '@angular/core';
import { Route, Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { MenuApi } from '@api/menu';
import { RouterVo } from '@core/models/system';
import { Layout } from '@layout/layout';
import { InnerLink } from '@layout/components/inner-link/inner-link';
import { resolveMenuIcon } from '@layout/icon-map';
import { dynamicRoutes } from '@pages/dynamic-routes';
import { resolveComponent } from '@pages/component-map';
import { UserStore } from './user.store';
import { isExternal } from '@core/utils/validate';

/** 侧边菜单节点（由后端 /getRouters 菜单树转换而来） */
export interface MenuNode {
  /** 完整路由路径，以 / 开头；外链菜单则为 http(s):// 开头的原始地址 */
  path: string;
  /** 菜单标题 */
  title: string;
  /** ant design 图标名 */
  icon?: string;
  /** 外链地址 */
  link?: string;
  /** 子菜单 */
  children?: MenuNode[];
}

const LAYOUT_COMPONENTS = new Set(['Layout', 'ParentView']);

function stripLeadingSlash(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path;
}

function joinPath(parent: string, current: string): string {
  if (!parent) {
    return current;
  }
  return current ? `${parent}/${current}` : parent;
}

/**
 * 外链菜单的 path 本身就是完整地址（http(s)://、mailto:、tel:），
 * 后端在个别场景下会带上前导 /（如 /http://ruoyi.vip），统一去掉后再判定。
 */
function resolveExternalPath(path: string): string | null {
  const trimmed = stripLeadingSlash(path);
  return isExternal(trimmed) ? trimmed : null;
}

/**
 * 权限与动态路由存储
 * 对应 ruoyi-vue3/src/store/modules/permission.js
 */
@Injectable({ providedIn: 'root' })
export class PermissionStore {
  private readonly api = inject(MenuApi);
  private readonly router = inject(Router);
  private readonly userStore = inject(UserStore);

  private readonly _sidebarRouters = signal<MenuNode[]>([]);
  private readonly _generated = signal(false);

  readonly sidebarRouters = this._sidebarRouters.asReadonly();
  /** 动态路由是否已生成 */
  readonly generated = this._generated.asReadonly();

  setSidebarRouters(nodes: MenuNode[]): void {
    this._sidebarRouters.set(nodes);
  }

  /**
   * 拉取后端菜单树，转换为 Angular 路由并注入 Router
   */
  generateRoutes(): Observable<Route[]> {
    return this.api.getRouters().pipe(
      map((res) => {
        const routers = res.data ?? [];
        const dynamic = this.buildRoutes(routers);
        this.setSidebarRouters(this.buildMenuNodes(routers));
        this.applyRoutes(dynamic);
        this._generated.set(true);
        return dynamic;
      }),
    );
  }

  reset(): void {
    this._sidebarRouters.set([]);
    this._generated.set(false);
  }

  /** 菜单树 → Angular 路由表 */
  private buildRoutes(routers: RouterVo[]): Route[] {
    const result: Route[] = [];
    for (const node of routers) {
      const route = this.toRoute(node, '');
      if (!route) {
        continue;
      }
      if (!route.path) {
        // 顶层 path 为 '/'（如一级菜单、内链），直接展开其子路由
        result.push(...(route.children ?? []));
      } else {
        result.push(route);
      }
    }
    return result;
  }

  private toRoute(node: RouterVo, parentPath: string): Route | null {
    const path = stripLeadingSlash(node.path ?? '');
    const currentPath = joinPath(parentPath, path);
    const component = node.component;
    const data = {
      title: node.meta?.title ?? '',
      noCache: node.meta?.noCache ?? false,
      link: node.meta?.link ?? null,
    };

    const children = (node.children ?? [])
      .map((child) => this.toRoute(child, currentPath))
      .filter((child): child is Route => child !== null);

    // 目录 / 多级中间层：仅作为路由容器
    // 注意：Angular 禁止 redirectTo 与 children 同时出现，
    // 目录默认跳转需通过空 path 子路由实现
    if (component && LAYOUT_COMPONENTS.has(component)) {
      if (!children.length) {
        return null;
      }
      return {
        path,
        data,
        children: [{ path: '', pathMatch: 'full', redirectTo: children[0].path }, ...children],
      };
    }

    // 外链
    if (component === 'InnerLink') {
      return { path, component: InnerLink, data: { ...data, link: node.meta?.link ?? node.path } };
    }

    const loader = resolveComponent(component);
    const route: Route = { path, data };
    if (loader) {
      route.loadComponent = loader;
    } else if (!children.length) {
      return null;
    }
    if (children.length) {
      route.children = children;
    }
    return route;
  }

  /** 菜单树 → 侧边栏菜单节点 */
  private buildMenuNodes(routers: RouterVo[]): MenuNode[] {
    return routers
      .map((node) => this.toMenuNode(node, ''))
      .filter((node): node is MenuNode => node !== null);
  }

  private toMenuNode(node: RouterVo, parentPath: string): MenuNode | null {
    if (node.hidden) {
      return null;
    }
    const rawPath = node.path ?? '';
    // 外链不能拼接父级路径、也不能补前导 /，否则会退化成 /http://xxx 这个站内路由
    const external = resolveExternalPath(rawPath);
    const currentPath = external ?? joinPath(parentPath, stripLeadingSlash(rawPath));
    const children = (node.children ?? [])
      .map((child) => this.toMenuNode(child, external ? parentPath : currentPath))
      .filter((child): child is MenuNode => child !== null);
    const title = node.meta?.title ?? '';
    if (!title && !children.length) {
      return null;
    }
    // 一级外链菜单（后端 meta 为 null、只包一个子项）直接提升子项，
    // 否则会渲染出一个标题为空的父级子菜单
    if (!title && children.length === 1) {
      return children[0];
    }
    return {
      path: external ?? `/${currentPath}`,
      title,
      icon: resolveMenuIcon(node.meta?.icon),
      link: node.meta?.link ?? external ?? undefined,
      children: children.length ? children : undefined,
    };
  }

  /** 将动态路由挂载到 Layout 壳的 children 上 */
  private applyRoutes(dynamic: Route[]): void {
    // 前端声明的动态路由按权限过滤
    const permitted = dynamicRoutes.filter((route) => {
      const permissions = route.data?.['permissions'] as string[] | undefined;
      return !permissions?.length || permissions.some((perm) => this.userStore.hasPermi(perm));
    });
    const config = this.router.config.map((route) => {
      if (route.component !== Layout) {
        return route;
      }
      const base = (route.children ?? []).filter(
        (child) => child.path === '' || child.path === 'index',
      );
      return {
        ...route,
        children: [...base, ...permitted, ...dynamic, { path: '**', redirectTo: '/404' }],
      };
    });
    this.router.resetConfig(config);
  }
}
