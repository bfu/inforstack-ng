import { ErrorHandler, Injectable } from '@angular/core';
import { environment } from '@env/environment';

/**
 * 全局错误处理器
 *
 * 兜底捕获运行时未处理异常（配合 app.config.ts 中的
 * provideBrowserGlobalErrorListeners()，window.onerror / unhandledrejection
 * 也会转发到这里）。此前仅 main.ts 的 console.error 兜底，线上白屏、
 * 运行时异常完全不可见。
 *
 * 接入错误监控（Sentry / 自建上报等）时：
 * 1. 在 environment.prod.ts 中配置 errorDsn；
 * 2. 在 handleError 中调用对应 SDK 的 captureException。
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    if (!environment.production) {
      // 开发环境保留完整堆栈，便于定位
      console.error('[GlobalErrorHandler]', error);
      return;
    }

    // 生产环境：静默收集，避免刷屏
    // TODO: errorDsn 非空时接入监控上报（captureException(error)）
    if (environment.errorDsn) {
      // 预留：errorDsn 已配置但尚未接入 SDK，先输出简要信息
      console.error('[GlobalErrorHandler]', error);
    }
  }
}
