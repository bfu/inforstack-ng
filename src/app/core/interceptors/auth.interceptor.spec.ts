import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpContext, HttpClient } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NO_REPEAT_SUBMIT, SKIP_TOKEN } from '@core/http-context';
import { setToken } from '@core/utils/auth';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor 请求拦截器', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Token 注入', () => {
    it('存在 Token 时注入 Authorization: Bearer', () => {
      setToken('abc');
      http.get('/dev-api/user').subscribe();

      const req = httpMock.expectOne('/dev-api/user');
      expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
      req.flush({});
    });

    it('无 Token 时不注入头', () => {
      http.get('/dev-api/user').subscribe();

      const req = httpMock.expectOne('/dev-api/user');
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({});
    });

    it('SKIP_TOKEN 上下文跳过注入', () => {
      setToken('abc');
      http.get('/dev-api/login', { context: new HttpContext().set(SKIP_TOKEN, true) }).subscribe();

      const req = httpMock.expectOne('/dev-api/login');
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({});
    });
  });

  describe('防重复提交', () => {
    it('1 秒内相同 URL 与 body 的 POST 被拒绝', () => {
      const errors: Error[] = [];

      http.post('/dev-api/save', { name: 'x' }).subscribe({ error: (e) => errors.push(e) });
      httpMock.expectOne('/dev-api/save').flush({});

      http.post('/dev-api/save', { name: 'x' }).subscribe({ error: (e) => errors.push(e) });

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('数据正在处理，请勿重复提交');
    });

    it('body 不同视为新请求放行', () => {
      http.post('/dev-api/save', { name: 'a' }).subscribe();
      httpMock.expectOne('/dev-api/save').flush({});

      http.post('/dev-api/save', { name: 'b' }).subscribe();
      httpMock.expectOne('/dev-api/save').flush({});
    });

    it('URL 不同放行', () => {
      http.post('/dev-api/save-a', { name: 'x' }).subscribe();
      httpMock.expectOne('/dev-api/save-a').flush({});

      http.post('/dev-api/save-b', { name: 'x' }).subscribe();
      httpMock.expectOne('/dev-api/save-b').flush({});
    });

    it('PUT 同样参与防重复校验', () => {
      http.put('/dev-api/update', { id: 1 }).subscribe();
      httpMock.expectOne('/dev-api/update').flush({});

      const errors: Error[] = [];
      http.put('/dev-api/update', { id: 1 }).subscribe({ error: (e) => errors.push(e) });

      expect(errors).toHaveLength(1);
    });

    it('GET 请求不参与防重复校验', () => {
      http.get('/dev-api/list').subscribe();
      httpMock.expectOne('/dev-api/list').flush({});

      http.get('/dev-api/list').subscribe();
      httpMock.expectOne('/dev-api/list').flush({});
    });

    it('NO_REPEAT_SUBMIT 上下文跳过校验', () => {
      const context = new HttpContext().set(NO_REPEAT_SUBMIT, true);

      http.post('/dev-api/login', { user: 'a' }, { context }).subscribe();
      httpMock.expectOne('/dev-api/login').flush({});

      http.post('/dev-api/login', { user: 'a' }, { context }).subscribe();
      httpMock.expectOne('/dev-api/login').flush({});
    });
  });
});
