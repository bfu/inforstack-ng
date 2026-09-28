import { Type } from '@angular/core';

/** 懒加载组件函数，与 Angular Route.loadComponent 签名一致 */
export type ComponentLoader = () => Promise<Type<unknown>>;

/**
 * 后端 component 字符串 → Angular 组件映射表
 * 对应 ruoyi-vue3 中 import.meta.glob('./../../views/**\/*.vue') 的动态加载
 *
 * 新增业务页面时需在此登记一行；未登记的菜单路由会被忽略
 */
export const COMPONENT_MAP: Record<string, ComponentLoader> = {
  'system/user/index': () => import('./system/user/user').then((m) => m.UserPage),
  'system/role/index': () => import('./system/role/role').then((m) => m.RolePage),
  'system/menu/index': () => import('./system/menu/menu').then((m) => m.MenuPage),
  'system/dept/index': () => import('./system/dept/dept').then((m) => m.DeptPage),
  'system/post/index': () => import('./system/post/post').then((m) => m.PostPage),
  'system/dict/index': () => import('./system/dict/dict').then((m) => m.DictPage),
  'system/config/index': () => import('./system/config/config').then((m) => m.ConfigPage),
  'system/notice/index': () => import('./system/notice/notice').then((m) => m.NoticePage),
  'monitor/operlog/index': () => import('./monitor/operlog/operlog').then((m) => m.OperlogPage),
  'monitor/logininfor/index': () =>
    import('./monitor/logininfor/logininfor').then((m) => m.LogininforPage),
  'monitor/online/index': () => import('./monitor/online/online').then((m) => m.OnlinePage),
  'monitor/job/index': () => import('./monitor/job/job').then((m) => m.JobPage),
  'monitor/server/index': () => import('./monitor/server/server').then((m) => m.ServerPage),
  'monitor/cache/index': () => import('./monitor/cache/cache').then((m) => m.CachePage),
  'monitor/cache/list': () => import('./monitor/cache/cache-list').then((m) => m.CacheListPage),
  'monitor/druid/index': () => import('./monitor/druid/druid').then((m) => m.DruidPage),
  'tool/gen/index': () => import('./tool/gen/gen').then((m) => m.GenPage),
  'tool/swagger/index': () => import('./tool/swagger/swagger').then((m) => m.SwaggerPage),
};

/** 根据后端 component 字符串解析懒加载函数 */
export function resolveComponent(component?: string | null): ComponentLoader | null {
  if (!component) {
    return null;
  }
  return COMPONENT_MAP[component] ?? null;
}
