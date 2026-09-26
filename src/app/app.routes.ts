import { Routes } from '@angular/router';
import { Layout } from './layout/layout';
import { authGuard } from './shared/guards/auth.guard';

/**
 * 常量路由：登录、注册、主框架壳与错误页
 * 对应 ruoyi-vue3/src/router/index.js 的 constantRoutes
 *
 * Layout 壳下的业务菜单路由由动态路由模块基于后端 /getRouters 注入
 * （见 store/permission.store.ts 的 applyRoutes）
 */
export const constantRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((m) => m.Register),
  },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'index' },
      {
        path: 'index',
        loadComponent: () => import('./pages/index/index').then((m) => m.Index),
        data: { title: '首页' },
      },
    ],
  },
  {
    path: '404',
    loadComponent: () => import('./pages/error/not-found').then((m) => m.NotFound),
  },
  { path: '**', redirectTo: '404' },
];

export const routes: Routes = constantRoutes;
