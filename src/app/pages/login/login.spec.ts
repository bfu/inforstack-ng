import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { LoginApi } from '@api/login';
import { UserStore } from '@store/user.store';
import { Login } from './login';

describe('Login', () => {
  let getCodeImg: ReturnType<typeof vi.fn>;
  let login: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let queryParams: Record<string, string>;

  beforeEach(() => {
    localStorage.clear();
    getCodeImg = vi.fn(() =>
      of({ code: 200, msg: '', captchaEnabled: true, img: 'abc', uuid: 'u1' }),
    );
    login = vi.fn(() => of({ code: 200, msg: '', token: 't' }));
    navigate = vi.fn();
    queryParams = {};
    TestBed.configureTestingModule({
      providers: [
        { provide: LoginApi, useValue: { getCodeImg } },
        { provide: UserStore, useValue: { login } },
        { provide: Router, useValue: { navigate } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams } } },
        { provide: NzMessageService, useValue: { error: vi.fn(), warning: vi.fn() } },
      ],
    });
  });

  /** 创建组件并等待 ngOnInit（验证码回填）完成 */
  async function create(): Promise<Login> {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  describe('验证码开关', () => {
    it('验证码开启：code 必填并回填 uuid', async () => {
      const page = await create();

      expect(page.captchaEnabled()).toBe(true);
      expect(page.codeUrl()).toBe('data:image/gif;base64,abc');
      expect(page.form.controls.uuid.value).toBe('u1');
      expect(page.form.controls.code.hasError('required')).toBe(true);
    });

    it('验证码关闭：移除必填校验', async () => {
      getCodeImg.mockReturnValue(of({ code: 200, msg: '', captchaEnabled: false }));
      const page = await create();

      expect(page.captchaEnabled()).toBe(false);
      expect(page.form.controls.code.hasError('required')).toBe(false);
    });

    it('captchaEnabled 未定义时默认开启', async () => {
      getCodeImg.mockReturnValue(of({ code: 200, msg: '' }));
      const page = await create();

      expect(page.captchaEnabled()).toBe(true);
    });
  });

  describe('记住我', () => {
    it('localStorage 有记住账号时回填', async () => {
      localStorage.setItem('login-username', 'admin');
      const page = await create();

      expect(page.form.controls.username.value).toBe('admin');
      expect(page.form.controls.rememberMe.value).toBe(true);
    });

    it('提交勾选记住我后写入 localStorage', async () => {
      const page = await create();
      page.form.patchValue({
        username: 'admin',
        password: '123',
        code: 'x',
        rememberMe: true,
      });

      page.submit();

      expect(localStorage.getItem('login-username')).toBe('admin');
    });

    it('未勾选时清除已记住账号', async () => {
      localStorage.setItem('login-username', 'old');
      const page = await create();
      page.form.patchValue({
        username: 'admin',
        password: '123',
        code: 'x',
        rememberMe: false,
      });

      page.submit();

      expect(localStorage.getItem('login-username')).toBeNull();
    });
  });

  describe('submit', () => {
    it('表单无效时不发起登录', async () => {
      const page = await create();
      page.submit();

      expect(login).not.toHaveBeenCalled();
      expect(page.loading()).toBe(false);
    });

    it('登录成功后跳转 redirect 参数指定的地址并剥离该参数', async () => {
      queryParams['redirect'] = '/system/user';
      queryParams['other'] = '1';
      const page = await create();
      page.form.patchValue({ username: 'admin', password: '123', code: 'x' });

      page.submit();

      expect(login).toHaveBeenCalledWith({
        username: 'admin',
        password: '123',
        code: 'x',
        uuid: 'u1',
      });
      expect(navigate).toHaveBeenCalledWith(['/system/user'], { queryParams: { other: '1' } });
      expect(navigate.mock.calls[0][1].queryParams).not.toHaveProperty('redirect');
    });

    it('无 redirect 时跳转 /index', async () => {
      const page = await create();
      page.form.patchValue({ username: 'admin', password: '123', code: 'x' });

      page.submit();

      expect(navigate).toHaveBeenCalledWith(['/index'], { queryParams: {} });
    });

    it('登录失败：重置 loading 并刷新验证码', async () => {
      login.mockReturnValue(throwError(() => new Error('bad')));
      const page = await create();
      page.form.patchValue({ username: 'admin', password: '123', code: 'x' });
      getCodeImg.mockClear();

      page.submit();

      expect(page.loading()).toBe(false);
      expect(getCodeImg).toHaveBeenCalledTimes(1);
    });
  });
});
