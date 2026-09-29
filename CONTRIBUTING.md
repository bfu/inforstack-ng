# 贡献指南

感谢你关注 inforstack-ng！本文说明参与贡献的流程与约定。

## 环境准备

- Node.js 20.19+ / 22+（仓库根有 `.nvmrc`，使用 nvm 可 `nvm use` 自动切换）
- npm 10+（本仓库锁定 `packageManager: npm@11.19.1`）
- 后端：定制版 [RuoYi-Angular](https://github.com/bfu/RuoYi-Angular)（MySQL + Redis，默认 8080）

```bash
git clone https://github.com/bfu/inforstack-ng.git
cd inforstack-ng
npm install
npm start   # http://localhost:4200
```

## 开发流程

1. Fork 并从 `main` 拉取特性分支：`feat/xxx`、`fix/xxx`、`docs/xxx`、`refactor/xxx`；
2. 开发与自测（见下方质量门禁）；
3. 提交 Pull Request 到 `main`，描述清楚动机与改动范围。

## 质量门禁（提交前请全部通过）

```bash
npm run lint   # ESLint（angular-eslint + typescript-eslint）
npm test       # Vitest 单元测试（不进入 watch：npx ng test --watch=false）
npm run build  # 生产构建
```

- 提交时 `pre-commit` 钩子会对暂存文件执行 ESLint --fix 与 Prettier；
- `commit-msg` 钩子会校验提交信息格式（Conventional Commits）。

## 提交信息规范（Conventional Commits）

格式：`<type>(<scope>): <subject>`

| type | 说明 |
| :--- | :--- |
| feat | 新功能 |
| fix | 缺陷修复 |
| refactor | 重构（不改变行为） |
| perf | 性能优化 |
| style | 格式调整（不影响逻辑） |
| test | 测试补充 |
| docs | 文档 |
| chore | 构建 / 工具链 / 依赖 |
| ci | CI 配置 |

scope 建议取：`core` / `api` / `layout` / `pages` / `shared` / `store` / `styles` / `deps` / `build` / `docs` / `test`。

示例：

```
feat(pages): 用户管理增加导入失败原因提示
fix(core): 401 登出未清理动态路由导致越权
```

## 代码约定

- 全部使用独立组件（standalone）：`@Component({ imports: [...] })`，不引入 NgModule；
- 模板与样式独立文件：`templateUrl` + `styleUrl`（Less）；
- 应用级 providers 只加在 `src/app/app.config.ts`；
- 会话清理一律走 `core/session.service.ts` 的 `resetAll()`，禁止只清 Token；
- 权限指令选择器是 `appHasPermi` / `appHasRole`；
- 详见仓库根 `AGENTS.md` 的「技术栈与既有约定」一节，写 NG-ZORRO 组件前先查离线文档。

## 测试要求

- 涉及 `core/`、`store/`、`shared/guards/` 的改动必须附带或更新对应 `*.spec.ts`；
- 纯函数优先直接断言输入输出；服务类用 TestBed + mock 依赖；
- 新增公开工具函数时请覆盖边界（null / undefined / 空串）。

## 报告问题

提 Issue 时请附：Angular/Node 版本、复现步骤、控制台报错、是否使用定制版后端。
