# inforstack-ng

RuoYi 管理系统的 **Angular 前端实现**：界面与交互对齐官方 RuoYi-Vue，后端接口完全一致，可直接对接任意 RuoYi（Spring Boot）后端，无需改动后端代码。

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![NG-ZORRO](https://img.shields.io/badge/NG--ZORRO-22-0170FE?logo=ant-design&logoColor=white)
![ECharts](https://img.shields.io/badge/ECharts-6-C1233C)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)

> 只含前端。后端需搭配定制版 [RuoYi-Angular](https://github.com/bfu/RuoYi-Angular) 使用：它在官方 RuoYi-Vue 基础上**只改动了代码生成**——生成模板改为输出 Angular 页面与 `api` 代码，其余接口完全一致。启动其 `ruoyi-admin`（MySQL + Redis），默认地址 `http://localhost:8080`。

## 特性

- **完全对齐 RuoYi-Vue**：路由、菜单、字典、权限、导入导出等行为与官方 Vue 版保持一致，接口零改造。
- **后端菜单驱动路由**：`pages/dynamic-routes.ts` 把后端返回的菜单树动态编译成 Angular 路由，菜单改动无需改前端代码。
- **细粒度权限**：`*hasPermi` 结构型指令控制按钮级权限，路由级由 `auth.guard.ts` 兜底。
- **标签页路由复用**：`core/reuse-strategy.ts` 实现多标签页打开、切换、刷新、关闭并保持组件状态。
- **统一请求层**：`core/request.service.ts` + 拦截器自动注入 Token、统一错误提示、401 自动登出，支持按请求关闭 loading / 错误弹窗。
- **字典与缓存**：字典数据在 `store/dict.store.ts` 全局缓存，配合 `dict-tag`、`dict.pipe` 零成本渲染。
- **内置系统 / 监控 / 工具三大模块**：用户、部门、岗位、菜单、角色、字典、参数、通知；在线用户、定时任务、操作日志、登录日志、缓存监控、服务监控、Druid；代码生成、Swagger。
- **代码生成直出 Angular**：配合定制后端的生成模板，建表后一键生成可直接放进本工程的页面与 `api` 代码，无需手工改写 Vue 模板。
- **主题与布局设置**：侧边栏主题、顶栏、标签页、深色模式等偏好持久化。

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
- 后端服务已启动：MySQL + Redis + `ruoyi-admin`（8080），且须为定制版 [bfu/RuoYi-Angular](https://github.com/bfu/RuoYi-Angular)

## 快速开始

```bash
git clone https://github.com/bfu/inforstack-ng.git
cd inforstack-ng
npm install
npm start           # ng serve，http://localhost:4200
```

默认账号：`admin / admin123`（取决于后端初始化数据）。

### 启动后端

```bash
git clone https://github.com/bfu/RuoYi-Angular.git
```

按后端 README 初始化 MySQL 与 Redis，启动 `ruoyi-admin` 监听 `8080`。使用未经改造的官方 RuoYi 后端也能正常登录和跑通业务，但**代码生成会输出 Vue 代码**，不能用于本工程。

接口前缀 `/dev-api` 由 `proxy.conf.json` 转发到 `http://localhost:8080`，`ng serve` 已在 `angular.json` 中通过 `proxyConfig` 自动加载，**后端无需额外配置 CORS**。后端地址不同时，改 `proxy.conf.json` 的 `target` 即可。

### 可用脚本

| 命令 | 说明 |
| :--- | :--- |
| `npm start` | 启动开发服务（4200），带接口代理 |
| `npm run build` | 生产构建，产物在 `dist/` |
| `npm run watch` | 开发模式增量构建 |
| `npm test` | Vitest 单元测试 |
| `npm run ng -- generate component xxx` | Angular CLI 脚手架 |

## 配置

环境相关配置集中在 `src/environments/environment.ts`，生产构建会替换为 `environment.prod.ts`：

| 字段 | 说明 |
| :--- | :--- |
| `apiBaseUrl` | 接口前缀，默认 `/dev-api` |
| `title` | 系统标题 |
| `pageSize` | 表格默认分页条数 |
| `registerEnabled` | 是否开放注册入口（需后端 `sys.account.registerUser` 同时开启） |
| `footerContent` | 页脚文案 |

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

## 相关链接

- [定制后端（必配）](https://github.com/bfu/RuoYi-Angular)：RuoYi-Vue 后端 + Angular 代码生成模板
- [RuoYi 官方（Vue 版）](https://gitee.com/y_project/RuoYi-Vue)
- [Angular CLI 概览与命令参考](https://angular.dev/tools/cli)
- [NG-ZORRO 官方文档](https://ng.ant.design/)

## 许可证

本项目为 RuoYi 前端的 Angular 实现，许可协议沿用 RuoYi 的 [MIT License](https://gitee.com/y_project/RuoYi/blob/master/LICENSE)。
