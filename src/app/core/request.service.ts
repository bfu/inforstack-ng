import { HttpClient, HttpContext, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '@env/environment';
import { NO_REPEAT_SUBMIT, REQUEST_TIMEOUT, RESPONSE_BLOB, SKIP_TOKEN } from './http-context';
import { tansParams } from './utils/ruoyi';

/** 请求附加选项，对应 ruoyi-vue3 中 headers 上的自定义开关 */
export interface RequestOptions {
  /** 是否跳过 Token 注入（登录、验证码、注册等） */
  skipToken?: boolean;
  /** 是否跳过防重复提交校验 */
  noRepeatSubmit?: boolean;
  /** 超时时间(ms)，默认 10000 */
  timeout?: number;
  /** 额外请求头 */
  headers?: Record<string, string>;
}

const DEFAULT_TIMEOUT = 10000;

/**
 * 统一请求服务
 * 对应 ruoyi-vue3/src/utils/request.js 暴露的 axios 实例
 * 注意：GET 参数使用 tansParams 序列化，保证后端能以 params[xxx] 形式接收
 */
@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  get<T>(url: string, params?: Record<string, unknown>, options: RequestOptions = {}): Observable<T> {
    return this.http
      .get<T>(this.buildUrl(url, params), this.buildOptions(options))
      .pipe(this.withTimeout(options));
  }

  post<T>(url: string, data?: unknown, options: RequestOptions = {}): Observable<T> {
    return this.http.post<T>(this.buildUrl(url), data, this.buildOptions(options)).pipe(this.withTimeout(options));
  }

  put<T>(url: string, data?: unknown, options: RequestOptions = {}): Observable<T> {
    return this.http.put<T>(this.buildUrl(url), data, this.buildOptions(options)).pipe(this.withTimeout(options));
  }

  delete<T>(url: string, params?: Record<string, unknown>, options: RequestOptions = {}): Observable<T> {
    return this.http
      .delete<T>(this.buildUrl(url, params), this.buildOptions(options))
      .pipe(this.withTimeout(options));
  }

  /** 文件流下载（GET） */
  getBlob(url: string, params?: Record<string, unknown>, options: RequestOptions = {}): Observable<Blob> {
    return this.http
      .get(this.buildUrl(url, params), { ...this.buildOptions(options, true), responseType: 'blob' })
      .pipe(this.withTimeout(options));
  }

  /** 文件流下载（GET，携带完整响应以便读取 download-filename 响应头） */
  getBlobResponse(
    url: string,
    params?: Record<string, unknown>,
    options: RequestOptions = {},
  ): Observable<HttpResponse<Blob>> {
    return this.http
      .get(this.buildUrl(url, params), {
        ...this.buildOptions(options, true),
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(this.withTimeout(options));
  }

  /** 文件流下载（POST，form-urlencoded，用于导出） */
  postBlob(url: string, data?: Record<string, unknown>, options: RequestOptions = {}): Observable<Blob> {
    const body = tansParams(data ?? {}).slice(0, -1);
    return this.http
      .post(this.buildUrl(url), body, {
        ...this.buildOptions(
          { ...options, headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(options.headers ?? {}) } },
          true,
        ),
        responseType: 'blob',
      })
      .pipe(this.withTimeout(options));
  }

  private buildUrl(url: string, params?: Record<string, unknown>): string {
    const fullUrl = `${this.baseUrl}${url}`;
    if (!params) {
      return fullUrl;
    }
    const query = tansParams(params);
    if (!query) {
      return fullUrl;
    }
    return `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}${query.slice(0, -1)}`;
  }

  private buildOptions(options: RequestOptions, isBlob = false): { context: HttpContext; headers?: HttpHeaders } {
    const context = new HttpContext();
    if (options.skipToken) {
      context.set(SKIP_TOKEN, true);
    }
    if (options.noRepeatSubmit) {
      context.set(NO_REPEAT_SUBMIT, true);
    }
    if (options.timeout) {
      context.set(REQUEST_TIMEOUT, options.timeout);
    }
    context.set(RESPONSE_BLOB, isBlob);
    const result: { context: HttpContext; headers?: HttpHeaders } = { context };
    if (options.headers) {
      result.headers = new HttpHeaders(options.headers);
    }
    return result;
  }

  private withTimeout<T>(options: RequestOptions) {
    return (source: Observable<T>): Observable<T> => source.pipe(timeout({ each: options.timeout ?? DEFAULT_TIMEOUT }));
  }
}
