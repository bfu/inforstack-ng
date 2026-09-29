/**
 * 开发环境配置
 * 对应 ruoyi-vue3 的 .env.development 中 VITE_APP_BASE_API
 */
export const environment = {
  production: false,
  /** 后端接口前缀，由 proxy.conf.json 转发至 http://localhost:8080 */
  apiBaseUrl: '/dev-api',
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
