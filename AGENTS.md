# AGENTS.md — inforstack-ng（Angular 22 + NG-ZORRO 22）

Angular CLI 22.2 生成的独立组件（standalone）工程，UI 组件一律使用 `ng-zorro-antd` ^22.1.1。

## 技术栈与既有约定

- Angular 22.2，全部为独立组件：`@Component({ imports: [...] })`，不使用 NgModule；应用级 providers 集中在 `src/app/app.config.ts`。
- NG-ZORRO 全局配置已就绪：`provideNzI18n(zh_CN)`、`provideNzIcons(icons)`（`src/app/icons-provider.ts`）、`provideNzDateFnsAdapter()`。
- 组件模板与样式独立成文件：`templateUrl: './xxx.html'` + `styleUrl: './xxx.less'`（Less）。
- 已知坑：`NzModalService` 不是 `providedIn: 'root'`，已在 `app.config.ts` 通过 `importProvidersFrom(NzModalModule)` 注册到根注入器（拦截器要用），**不要删除也不要重复 provide**。
- 后端接口代理见 `proxy.conf.json`。

## NG-ZORRO 离线文档（写 UI 前务必查）

| 文件 | 用途 |
| ---- | ---- |
| `docs/ng-zorro/llms.txt` | 组件索引：77 个组件 + 各章节在全文中的起始行号 |
| `docs/ng-zorro/llms-full.txt` | NG-ZORRO 官方文档全量副本（约 580KB） |

1. **禁止整文件读入上下文**。必须按行区间局部读取。
2. 正确流程：先在 `docs/ng-zorro/llms.txt` 查到目标组件起始行 → 读取该行开始的片段（组件正文在下一个组件 `title:` 之前结束）→ 按文档中的 API 表与示例写代码。
3. 行号若因文档重新生成而漂移，用 `^title: <组件名>$` 重新定位全文。
4. 不要凭记忆写 NG-ZORRO 的 API（输入属性、`NzXxxService` 方法签名、可选值），一律以上述离线文档为准；文档与直觉冲突时以文档为准。

## 常用命令

```bash
ng serve     # 开发服务，http://localhost:4200
ng build     # 构建到 dist/
ng test      # Vitest 单元测试
```
