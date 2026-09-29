import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { NzModalService } from 'ng-zorro-antd/modal';
import { LoginApi } from '@api/login';
import { Register } from './register';

describe('Register', () => {
  let getCodeImg: ReturnType<typeof vi.fn>;
  let register: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let modalError: ReturnType<typeof vi.fn>;
  let afterClose: { subscribe: (fn: () => void) => void };

  beforeEach(() => {
    getCodeImg = vi.fn(() =>
      of({ code: 200, msg: '', captchaEnabled: true, img: 'abc', uuid: 'u1' }),
    );
    register = vi.fn(() => of({ code: 200, msg: '注册成功' }));
    navigate = vi.fn();
    afterClose = {
      subscribe: (fn: () => void) => {
        fn();
      },
    };
    modalError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: LoginApi, useValue: { getCodeImg, register } },
        {
          provide: NzModalService,
          useValue: {
            error: modalError,
            success: vi.fn(() => ({ afterClose })),
          },
        },
      ],
    });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(navigate as never);
  });

  /** 创建组件并等待 ngOnInit（验证码回填）完成 */
  async function create(): Promise<Register> {
    const fixture = TestBed.createComponent(Register);
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  it('ngOnInit 拉取验证码并设置 code 必填', async () => {
    const page = await create();

    expect(page.captchaEnabled()).toBe(true);
    expect(page.form.controls.code.hasError('required')).toBe(true);
  });

  it('两次密码不一致时表单 notEqual 且不提交', async () => {
    const page = await create();
    page.form.patchValue({
      username: 'newuser',
      password: '123456',
      confirmPassword: '654321',
      code: 'x',
    });

    page.submit();

    expect(page.form.hasError('notEqual')).toBe(true);
    expect(register).not.toHaveBeenCalled();
    expect(modalError).toHaveBeenCalledWith(
      expect.objectContaining({ nzContent: '两次输入的密码不一致' }),
    );
  });

  it('注册成功后提示并跳转登录页', async () => {
    const page = await create();
    page.form.patchValue({
      username: 'newuser',
      password: '123456',
      confirmPassword: '123456',
      code: 'x',
    });

    page.submit();

    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'newuser', password: '123456' }),
    );
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('注册失败重置 loading 并刷新验证码', async () => {
    register.mockReturnValue(throwError(() => new Error('bad')));
    const page = await create();
    page.form.patchValue({
      username: 'newuser',
      password: '123456',
      confirmPassword: '123456',
      code: 'x',
    });
    getCodeImg.mockClear();

    page.submit();

    expect(page.loading()).toBe(false);
    expect(getCodeImg).toHaveBeenCalledTimes(1);
  });
});
