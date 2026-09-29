import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpClient, HttpContext } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { SessionService } from '@core/session.service';
import { RESPONSE_BLOB } from '@core/http-context';
import { ERROR_CODE } from '@core/utils/error-code';
import { errorInterceptor, isRelogin, SessionExpiredError } from './error.interceptor';

describe('errorInterceptor 响应拦截器', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let routerMock: { navigate: ReturnType<typeof vi.fn> };
  let messageMock: { error: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };
  let modalMock: { confirm: ReturnType<typeof vi.fn> };
  let sessionMock: { resetAll: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: NzMessageService, useValue: { error: vi.fn(), warning: vi.fn() } },
        { provide: NzModalService, useValue: { confirm: vi.fn() } },
        { provide: SessionService, useValue: { resetAll: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    routerMock = TestBed.inject(Router) as unknown as typeof routerMock;
    messageMock = TestBed.inject(NzMessageService) as unknown as typeof messageMock;
    modalMock = TestBed.inject(NzModalService) as unknown as typeof modalMock;
    sessionMock = TestBed.inject(SessionService) as unknown as typeof sessionMock;
    isRelogin.show = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    httpMock.verify();
    isRelogin.show = false;
  });

  it('code 200 正常放行', () => {
    const next = vi.fn();
    http.get('/api/x').subscribe({ next });

    httpMock.expectOne('/api/x').flush({ code: 200, msg: 'ok' });
    expect(next).toHaveBeenCalledWith({ code: 200, msg: 'ok' });
    expect(messageMock.error).not.toHaveBeenCalled();
  });

  it('code 500 提示错误并抛出', () => {
    const errors: Error[] = [];
    http.get('/api/x').subscribe({ error: (e) => errors.push(e) });

    httpMock.expectOne('/api/x').flush({ code: 500, msg: '服务器内部错误' });
    expect(messageMock.error).toHaveBeenCalledWith('服务器内部错误');
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('服务器内部错误');
  });

  it('code 601 警告提示', () => {
    http.get('/api/x').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/x').flush({ code: 601, msg: '警告信息' });
    expect(messageMock.warning).toHaveBeenCalledWith('警告信息');
  });

  it('其他业务码使用错误码表映射提示', () => {
    http.get('/api/x').subscribe({ error: () => undefined });

    httpMock.expectOne('/api/x').flush({ code: 403 });
    expect(messageMock.error).toHaveBeenCalledWith(ERROR_CODE['403']);
  });

  describe('401 会话过期', () => {
    it('弹出重新登录确认框并抛出错误', () => {
      const errors: Error[] = [];
      http.get('/api/x').subscribe({ error: (e) => errors.push(e) });

      httpMock.expectOne('/api/x').flush({ code: 401, msg: '过期' });

      expect(modalMock.confirm).toHaveBeenCalledTimes(1);
      expect(isRelogin.show).toBe(true);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(SessionExpiredError);
      expect(errors[0].message).toBe('无效的会话，或者会话已过期，请重新登录。');
      expect(messageMock.error).not.toHaveBeenCalled();
    });

    it('并发多个 401 只弹一次确认框', () => {
      http.get('/api/x').subscribe({ error: () => undefined });
      http.get('/api/y').subscribe({ error: () => undefined });

      httpMock.expectOne('/api/x').flush({ code: 401, msg: '过期' });
      httpMock.expectOne('/api/y').flush({ code: 401, msg: '过期' });

      expect(modalMock.confirm).toHaveBeenCalledTimes(1);
    });

    it('确认重新登录：清理全部会话态并跳转登录页', () => {
      http.get('/api/x').subscribe({ error: () => undefined });
      httpMock.expectOne('/api/x').flush({ code: 401, msg: '过期' });

      const options = modalMock.confirm.mock.calls[0][0] as { nzOnOk: () => void };
      options.nzOnOk();

      expect(sessionMock.resetAll).toHaveBeenCalledTimes(1);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
      expect(isRelogin.show).toBe(false);
    });

    it('取消弹窗后重置 isRelogin 状态', () => {
      http.get('/api/x').subscribe({ error: () => undefined });
      httpMock.expectOne('/api/x').flush({ code: 401, msg: '过期' });

      const options = modalMock.confirm.mock.calls[0][0] as { nzOnCancel: () => void };
      options.nzOnCancel();

      expect(isRelogin.show).toBe(false);
      expect(sessionMock.resetAll).not.toHaveBeenCalled();
    });
  });

  describe('网络层异常', () => {
    it('status 0 提示后端连接异常', () => {
      http.get('/api/x').subscribe({ error: () => undefined });

      httpMock
        .expectOne('/api/x')
        .error(new ErrorEvent('network'), { status: 0, statusText: 'Unknown Error' });

      expect(messageMock.error).toHaveBeenCalledWith('后端接口连接异常', { nzDuration: 5000 });
    });

    it('超时异常提示请求超时', () => {
      http.get('/api/x').subscribe({ error: () => undefined });

      httpMock
        .expectOne('/api/x')
        .error(new ErrorEvent('timeout', { message: 'Timeout has occurred' }), {
          status: 504,
          statusText: 'Gateway Timeout',
        });

      expect(messageMock.error).toHaveBeenCalledWith('系统接口请求超时', { nzDuration: 5000 });
    });
  });

  it('RESPONSE_BLOB 上下文跳过业务码解析', () => {
    const next = vi.fn();
    http
      .get('/api/x', {
        responseType: 'blob',
        context: new HttpContext().set(RESPONSE_BLOB, true),
      })
      .subscribe({ next });

    const body = new Blob(['{}'], { type: 'application/octet-stream' });
    httpMock.expectOne('/api/x').flush(body);

    expect(next).toHaveBeenCalled();
    expect(messageMock.error).not.toHaveBeenCalled();
  });
});
