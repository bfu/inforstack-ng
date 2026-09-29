/**
 * 生产环境配置
 * 对应 ruoyi-vue3 的 .env.production 中 VITE_APP_BASE_API
 */
export const environment = {
  production: true,
  /** 后端接口前缀，由 Nginx 转发 */
  apiBaseUrl: '/prod-api',
  /** 系统标题 */
  title: '若依管理系统',
  /** 默认分页条数 */
  pageSize: 10,
  /** 是否开放注册入口（需后端 sys.account.registerUser 同时开启） */
  registerEnabled: false,
  /** 页脚文案 */
  footerContent: 'Copyright © 2019-present RuoYi. All Rights Reserved.',
  /** 错误监控上报地址（Sentry DSN 等），为空表示未接入 */
  errorDsn: '',
};
