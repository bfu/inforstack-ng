import { ComponentRef, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';

interface DetachedHandle extends DetachedRouteHandle {
  componentRef?: ComponentRef<unknown>;
}

/** 不参与缓存的顶层路由：登录 / 注册 / 错误页 / 通配兜底 */
const NO_CACHE_PATHS = new Set(['login', 'register', '404', '**']);

/**
 * 路由复用策略：为 TagsView 提供页面级缓存
 * 对应 ruoyi-vue3 中 <keep-alive :include="cachedViews"> 的能力
 *
 * 仅缓存叶子路由，按实际 URL（不含查询参数）作为缓存键
 */
@Injectable({ providedIn: 'root' })
export class RuoYiReuseStrategy implements RouteReuseStrategy {
  private readonly handlers = new Map<string, DetachedRouteHandle>();

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    // 仅叶子路由参与缓存
    if (!route.routeConfig || route.children.length > 0) {
      return false;
    }
    // 后端菜单 meta.noCache 标记的页面不缓存
    if (route.data?.['noCache']) {
      return false;
    }
    // 登录、注册、404、通配兜底路由无需缓存
    return !NO_CACHE_PATHS.has(route.routeConfig?.path ?? '');
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle | null): void {
    const key = this.getKey(route);
    if (key && handle) {
      this.handlers.set(key, handle);
    }
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const key = this.getKey(route);
    return key !== null && this.handlers.has(key);
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const key = this.getKey(route);
    return key ? (this.handlers.get(key) ?? null) : null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return (
      future.routeConfig === curr.routeConfig &&
      JSON.stringify(future.params) === JSON.stringify(curr.params)
    );
  }

  /** 清除指定路径的缓存 */
  clear(path: string): void {
    const handle = this.handlers.get(path) as DetachedHandle | undefined;
    if (handle?.componentRef) {
      handle.componentRef.destroy();
    }
    this.handlers.delete(path);
  }

  /** 清除全部缓存 */
  clearAll(): void {
    this.handlers.forEach((handle) => {
      const ref = (handle as DetachedHandle)?.componentRef;
      ref?.destroy();
    });
    this.handlers.clear();
  }

  private getKey(route: ActivatedRouteSnapshot): string | null {
    if (!route.routeConfig) {
      return null;
    }
    const url = route.pathFromRoot
      .map((node) => node.url.map((segment) => segment.path).join('/'))
      .filter((segment) => segment)
      .join('/');
    return url ? `/${url}` : null;
  }
}
