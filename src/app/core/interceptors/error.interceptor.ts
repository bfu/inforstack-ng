import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { catchError, map, throwError } from 'rxjs';
import { RESPONSE_BLOB } from '@core/http-context';
import { SessionService } from '@core/session.service';
import { resolveErrorMessage } from '@core/utils/error-code';

/**
 * 响应拦截器：统一处理业务状态码与网络异常
 * 对应 ruoyi-vue3/src/utils/request.js 的 response 拦截器
 */

/** 是否显示重新登录弹窗（防止并发请求重复弹出） */
export const isRelogin = { show: false };

/**
 * 会话过期错误
 *
 * 供 authGuard 等调用方类型化判定失败原因，避免用错误文案字符串比较。
 * message 与 ruoyi-vue3 保持一致。
 */
export class SessionExpiredError extends Error {
  constructor(message = '无效的会话，或者会话已过期，请重新登录。') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

/** RxJS TimeoutError 的 message 为 'Timeout has occurred'，需忽略大小写匹配 */
const TIMEOUT_MESSAGE = /timeout/i;

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const message = inject(NzMessageService);
  const modal = inject(NzModalService);
  const session = inject(SessionService);
  const isBlob = req.context.get(RESPONSE_BLOB);

  return next(req).pipe(
    // 网络层异常
    catchError((error: HttpErrorResponse) => {
      let msg = error.message;
      if (error.status === 0) {
        msg = '后端接口连接异常';
      } else if (TIMEOUT_MESSAGE.test(msg)) {
        msg = '系统接口请求超时';
      }
      message.error(msg, { nzDuration: 5000 });
      return throwError(() => error);
    }),
    // 业务状态码
    map((event) => {
      if (!(event instanceof HttpResponse) || isBlob) {
        return event;
      }
      const body = event.body as { code?: number; msg?: string } | null;
      if (!body || typeof body !== 'object') {
        return event;
      }
      const code = body.code ?? 200;
      const msg = resolveErrorMessage(code, body.msg);

      if (code === 401) {
        if (!isRelogin.show) {
          isRelogin.show = true;
          modal.confirm({
            nzTitle: '系统提示',
            nzContent: '登录状态已过期，您可以继续留在该页面，或者重新登录',
            nzOkText: '重新登录',
            nzCancelText: '取消',
            nzOnOk: () => {
              isRelogin.show = false;
              // 必须清理全部会话态：只清 Token 会让 authGuard 命中 user.loaded()
              // 而跳过 getInfo / generateRoutes，沿用上一个账号的菜单与权限
              session.resetAll();
              router.navigate(['/login']);
            },
            nzOnCancel: () => {
              isRelogin.show = false;
            },
          });
        }
        throw new SessionExpiredError();
      } else if (code === 500) {
        message.error(msg);
        throw new Error(msg);
      } else if (code === 601) {
        message.warning(msg);
        throw new Error(msg);
      } else if (code !== 200) {
        message.error(msg);
        throw new Error(msg);
      }
      return event;
    }),
  );
};
