import { HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { NO_REPEAT_SUBMIT, SKIP_TOKEN } from '@core/http-context';
import { cache } from '@core/utils/cache';
import { getToken } from '@core/utils/auth';

/**
 * 请求拦截器：注入 Token + 防重复提交
 * 对应 ruoyi-vue3/src/utils/request.js 的 request 拦截器
 */
const REPEAT_SUBMIT_KEY = 'sessionObj';
/** 间隔时间(ms)，小于此时间视为重复提交 */
const REPEAT_INTERVAL = 1000;
/** 限制存放数据 5M */
const LIMIT_SIZE = 5 * 1024 * 1024;

interface SubmitRecord {
  url: string;
  data: string;
  time: number;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Token 注入
  if (!req.context.get(SKIP_TOKEN)) {
    const token = getToken();
    if (token) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
  }

  // 2. 防重复提交（仅 post / put）
  const method = req.method.toLowerCase();
  if (!req.context.get(NO_REPEAT_SUBMIT) && (method === 'post' || method === 'put')) {
    const record: SubmitRecord = {
      url: req.urlWithParams,
      data: typeof req.body === 'object' ? JSON.stringify(req.body) : String(req.body ?? ''),
      time: new Date().getTime(),
    };
    const requestSize = JSON.stringify(record).length;
    if (requestSize < LIMIT_SIZE) {
      const previous = cache.session.getJSON<SubmitRecord>(REPEAT_SUBMIT_KEY);
      if (!previous) {
        cache.session.setJSON(REPEAT_SUBMIT_KEY, record);
      } else if (
        previous.data === record.data &&
        record.time - previous.time < REPEAT_INTERVAL &&
        previous.url === record.url
      ) {
        const message = '数据正在处理，请勿重复提交';
        console.warn(`[${previous.url}]: ${message}`);
        return throwError(() => new Error(message));
      } else {
        cache.session.setJSON(REPEAT_SUBMIT_KEY, record);
      }
    } else {
      console.warn(`[${req.url}]: 请求数据大小超出允许的5M限制，无法进行防重复提交验证。`);
    }
  }

  return next(req);
};
