# 安全策略

## 报告漏洞

请勿通过公开 Issue 报告安全漏洞。请通过 GitHub 私有漏洞报告（Security Advisories → Report a vulnerability）提交，我们会在 3 个工作日内响应。

报告时请尽量包含：

- 影响范围（登录态 / 越权 / XSS / 依赖漏洞等）；
- 复现步骤或 PoC；
- 受影响的版本或提交号。

## 依赖安全

- 仓库通过 Dependabot 周期检查依赖更新与安全通告；
- 合并依赖升级 PR 前请确认 `npm run build` 与 `npm test` 通过；
- 高危依赖漏洞（`npm audit` critical/high）优先处理。

## 安全相关注意事项（面向部署者）

- 生产部署建议由 Nginx 转发 `/prod-api` 至后端并启用 HTTPS，避免 Token 明文传输；
- 后端返回的菜单/权限仅控制前端展示，真正的越权防护在后端接口层；
- 若自行构建镜像，请勿将 `environment.prod.ts` 中的敏感配置提交进仓库。
