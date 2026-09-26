import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '../core/request.service';
import { AjaxResult } from '../core/models/result';
import { SysUser } from '../core/models/system';

/** 登录参数 */
export interface LoginBody {
  username: string;
  password: string;
  code: string;
  uuid: string;
}

/** 注册参数 */
export interface RegisterBody {
  username: string;
  password: string;
  confirmPassword?: string;
  code?: string;
  uuid?: string;
}

/** /login 返回 */
export interface LoginResult {
  code: number;
  msg: string;
  token: string;
}

/** /captchaImage 返回 */
export interface CaptchaResult {
  code: number;
  msg: string;
  captchaEnabled?: boolean;
  img?: string;
  uuid?: string;
}

/** /getInfo 返回 */
export interface UserInfoResult {
  code: number;
  msg: string;
  user: SysUser;
  roles: string[];
  permissions: string[];
  pwdChrtype: string;
  isDefaultModifyPwd: boolean;
  isPasswordExpired: boolean;
}

/**
 * 登录认证相关接口
 * 对应 ruoyi-vue3/src/api/login.js
 */
@Injectable({ providedIn: 'root' })
export class LoginApi {
  private readonly request = inject(RequestService);

  login(data: LoginBody): Observable<LoginResult> {
    return this.request.post<LoginResult>('/login', data, { skipToken: true, noRepeatSubmit: true });
  }

  register(data: RegisterBody): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/register', data, { skipToken: true });
  }

  getInfo(): Observable<UserInfoResult> {
    return this.request.get<UserInfoResult>('/getInfo');
  }

  logout(): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/logout');
  }

  getCodeImg(): Observable<CaptchaResult> {
    return this.request.get<CaptchaResult>('/captchaImage', undefined, { skipToken: true, timeout: 20000 });
  }
}
