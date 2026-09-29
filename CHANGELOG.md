# Changelog

本项目的显著变更记录。格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 工程化基础设施：ESLint（angular-eslint + typescript-eslint，扁平配置）、husky pre-commit / commit-msg 钩子、lint-staged、commitlint（Conventional Commits + scope 枚举）、`.nvmrc` 与 `package.json` `engines` 约束；
- 核心模块单元测试（Vitest，91 个用例）：`core/utils`（auth / cache / error-code / ruoyi / validate）、`core/reuse-strategy.ts`、`core/session.service.ts`、`core/interceptors`（auth / error）、`shared/guards/auth.guard.ts`、`store/dict.store.ts`；
- 全局错误处理器 `core/global-error-handler.ts` 注册到 `app.config.ts`，`environment` 新增 `errorDsn` 监控接入点；
- 贡献指南（`CONTRIBUTING.md`）、安全策略（`SECURITY.md`）、本变更日志；
- Dependabot 依赖自动更新配置。

### Fixed

- `icons-provider.ts`：补齐 `UnlockOutline` 导入（此前为存量的编译错误）；
- 清理未使用的导入：`TreeSelectNode`（用户管理页 / auth-role）、`SysDept`（用户 API）、`inject`（echart 组件）。

### Changed

- 模板可访问性规则（label 关联、click 键盘事件、可聚焦）以 warning 级别暴露存量问题，供后续渐进修复。

### Added（界面层测试）

- 新增页面/布局层单元测试，覆盖此前未测试的 24 个组件：测试文件 36 → 60，用例 267 → 441（全部通过，`ng test --watch=false` 无未处理错误）：
  - 登录与公共页：`pages/login`、`pages/register`、`pages/index`、`pages/error/not-found`；
  - 系统管理：`system/config`、`system/dept`、`system/menu`、`system/notice`、`system/post`、`system/role`、`system/role/auth-user`、`system/dict`（字典类型 + 字典数据）、`system/user`、`system/user/auth-role`；
  - 系统监控：`monitor/online`、`monitor/job`、`monitor/job/job-log`、`monitor/operlog`、`monitor/logininfor`、`monitor/cache`、`monitor/cache-list`、`monitor/server`、`monitor/druid`；
  - 系统工具：`tool/gen`（列表/导入表/建表/预览）、`tool/gen-edit`、`tool/swagger`；
  - 布局：`layout`（响应式断点）、`layout/components/navbar`（面包屑/全屏/登出）、`sidebar`（菜单主题/外链/activeMenu 高亮/缩进）、`tags-view`（页签增删改与刷新）、`settings`（主题与布局开关）、`app-main`、`parent-view`、`inner-link`；
- 测试基建：新增 `src/test-providers.ts`（由 `angular.json` 的 `test.providersFile` 引用）统一提供 NG-ZORRO 图标、中文文案与日期适配器；新增 `src/testing/modal-mock.ts` 的 `stubModalService()`，统一对页面实际注入的 `NzModalService` 打桩（`confirm` 可切换确认/取消/仅记录，`create` 返回不创建 overlay 的引用桩），并新增 `@testing/*` 路径别名。

### Fixed（界面层测试）

- `NzModalService` 由 `NzModalModule` 在组件注入器提供，环境级 mock 会被遮蔽：页面弹窗打开时真实服务因父级 mock 缺少 `openModals` 抛出 `TypeError: Cannot read properties of undefined (reading 'push')`，改为打桩后消除全部未处理错误（unhandled errors 5 → 0）。
