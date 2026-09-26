import { Route } from '@angular/router';

/**
 * 前端声明的动态路由（不来自后端菜单，需按权限过滤后注入）
 * 对应 ruoyi-vue3/src/router/index.js 的 dynamicRoutes
 *
 * data.permissions 用于权限过滤，data.activeMenu 用于侧边栏高亮
 */
export const dynamicRoutes: Route[] = [
  {
    path: 'system/user-auth/role/:userId',
    loadComponent: () => import('./system/user/auth-role').then((m) => m.UserAuthRole),
    data: { title: '分配角色', activeMenu: '/system/user', permissions: ['system:user:edit'] },
  },
  {
    path: 'system/role-auth/user/:roleId',
    loadComponent: () => import('./system/role/auth-user').then((m) => m.RoleAuthUser),
    data: { title: '分配用户', activeMenu: '/system/role', permissions: ['system:role:edit'] },
  },
  {
    path: 'monitor/job-log/index/:jobId',
    loadComponent: () => import('./monitor/job/job-log').then((m) => m.JobLogPage),
    data: { title: '调度日志', activeMenu: '/monitor/job', permissions: ['monitor:job:list'] },
  },
  {
    path: 'tool/gen-edit/index/:tableId',
    loadComponent: () => import('./tool/gen/gen-edit').then((m) => m.GenEditPage),
    data: { title: '修改生成配置', activeMenu: '/tool/gen', permissions: ['tool:gen:edit'] },
  },
];
