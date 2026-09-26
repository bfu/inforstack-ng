# inforstack-ng

RuoYi 管理系统的 **Angular 前端**，配套后端为仓库根目录的 Spring Boot 工程（`ruoyi-admin`，默认 `http://localhost:8080`）。后端接口与官方 RuoYi-Vue 完全一致，仅前端由 Vue 重写为 Angular。

## 技术栈

| 项 | 版本 / 选型 |
| :--- | :--- |
| Angular | 22.2（全量 standalone 独立组件，不使用 NgModule） |
| UI 组件库 | NG-ZORRO 22（Ant Design 的 Angular 实现） |
| 状态管理 | RxJS 7 + Service 单例（`src/app/store`） |
| 图表 | ECharts 6 |
| 样式 | Less（组件样式 4kB 警告 / 8kB 上限） |
| 构建 | Angular CLI 22（`@angular/build`，esbuild） |
| 测试 | Vitest（`ng test`） |

## 环境要求

- Node.js 20.19+ / 22+（Angular 22 要求），npm 10+
- 后端服务已启动：MySQL + Redis + `ruoyi-admin`（8080）

## 快速开始

```bash
npm install
npm start           # ng serve，http://localhost:4200
```

默认账号：`admin / admin123`。

接口前缀 `/dev-api` 由 `proxy.conf.json` 转发到 `http://localhost:8080`（`ng serve` 已通过 `angular.json` 的 `proxyConfig` 自动加载），无需后端额外配置 CORS。若后端地址不同，改 `proxy.conf.json` 的 `target` 即可。

其他命令：

```bash
npm run build       # 生产构建，产物在 dist/
npm run watch       # 开发模式增量构建
npm test            # Vitest 单元测试
npm run ng -- generate component xxx   # 脚手架
```

环境相关配置集中在 `src/environments/environment.ts`：接口前缀 `apiBaseUrl`、系统标题 `title`、默认分页大小 `pageSize`、是否开放注册 `registerEnabled`、页脚文案等；生产构建会替换为 `environment.prod.ts`。

## 目录结构

```
src/app
├── api/            # 后端接口封装（system / monitor / tool / login / menu / common）
├── core/           # 基础设施
│   ├── interceptors/   # auth（Token 注入）、error（统一错误提示与登出）
│   ├── models/         # 后端数据模型（result / system / monitor / tool）
│   ├── utils/          # auth、cache、error-code、ruoyi、validate
│   ├── request.service.ts   # 统一请求封装
│   ├── download.service.ts  # 导入导出下载
│   ├── http-context.ts      # 控制 loading / 错误提示开关
│   └── reuse-strategy.ts    # 标签页路由复用策略
├── layout/         # 布局：sidebar、navbar、tags-view、app-main、settings、inner-link、parent-view
├── pages/          # 业务页面
│   ├── system/     # user dept post menu role dict config notice
│   ├── monitor/    # online job operlog logininfor cache server druid
│   ├── tool/       # gen swagger
│   ├── login/ register/ index/ welcome/ error/
│   ├── dynamic-routes.ts   # 后端菜单 → Angular 路由
│   └── component-map.ts    # 菜单 component 名 → 组件映射
├── shared/         # 通用组件（dict-tag / echart / file-upload / image-upload / iframe-frame）、
│                   # 指令 hasPermi、守卫 auth.guard、管道 dict.pipe、工具 tree.util / table-selection
├── store/          # app / user / permission / dict / settings / tags-view 状态
├── icons-provider.ts   # NG-ZORRO 图标按需注册
├── app.config.ts       # 应用级 providers
├── app.routes.ts       # 静态路由
└── app.ts / app.html / app.less
```

## 开发约定

- 新组件一律为独立组件：`@Component({ imports: [...] })`，模板与样式独立成文件（`templateUrl` + `styleUrl`，Less）。
- 应用级 providers 集中在 `src/app/app.config.ts`（已配置 `provideNzI18n(zh_CN)`、`provideNzIcons(icons)`、`provideNzDateFnsAdapter()`）。
- `NzModalService` 不是 `providedIn: 'root'`，已通过 `importProvidersFrom(NzModalModule)` 注册到根注入器，**不要删除也不要重复 provide**（拦截器依赖它）。
- 写 UI 前先查离线文档：`docs/ng-zorro/llms.txt` 查组件起始行 → 按行区间读取 `docs/ng-zorro/llms-full.txt`；**不要整文件读入上下文，也不要凭记忆编造 NG-ZORRO API**。
- 权限：`*hasPermi` 结构型指令控制按钮，路由由 `pages/dynamic-routes.ts` 根据后端菜单动态生成，`shared/guards/auth.guard.ts` 控制登录态。

## 更多资源

- [Angular CLI 概览与命令参考](https://angular.dev/tools/cli)
- [NG-ZORRO 官方文档](https://ng.ant.design/)
- 仓库根目录 `README.md`：整体架构、后端启动与已实现功能清单
