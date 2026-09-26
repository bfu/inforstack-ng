import { Injectable, computed, inject, signal } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Observable, tap } from 'rxjs';
import { LoginApi, LoginBody, LoginResult, UserInfoResult } from '@api/login';
import { environment } from '@env/environment';
import { SysUser } from '@core/models/system';
import { cache } from '@core/utils/cache';
import { getToken, removeToken, setToken } from '@core/utils/auth';
import { isEmpty, isHttp } from '@core/utils/validate';

/**
 * 用户状态存储（signals 版）
 * 对应 ruoyi-vue3/src/store/modules/user.js
 */
@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly api = inject(LoginApi);
  private readonly message = inject(NzMessageService);

  private readonly _token = signal(getToken());
  private readonly _id = signal<number | null>(null);
  private readonly _name = signal('');
  private readonly _nickName = signal('');
  private readonly _avatar = signal('');
  private readonly _roles = signal<string[]>([]);
  private readonly _permissions = signal<string[]>([]);

  readonly token = this._token.asReadonly();
  readonly id = this._id.asReadonly();
  readonly name = this._name.asReadonly();
  readonly nickName = this._nickName.asReadonly();
  readonly avatar = this._avatar.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly permissions = this._permissions.asReadonly();

  /** 是否已加载过用户信息（供路由守卫判断） */
  readonly loaded = computed(() => this._roles().length > 0);

  /** 登录：成功后写入 Token */
  login(body: LoginBody): Observable<LoginResult> {
    return this.api.login(body).pipe(
      tap((res) => {
        setToken(res.token);
        this._token.set(res.token);
      }),
    );
  }

  /** 获取用户信息（角色、权限） */
  getInfo(): Observable<UserInfoResult> {
    return this.api.getInfo().pipe(
      tap((res) => {
        const user = res.user ?? ({} as SysUser);
        let avatar = user.avatar ?? '';
        if (!isEmpty(avatar) && !isHttp(avatar)) {
          avatar = environment.apiBaseUrl + avatar;
        }
        if (res.roles && res.roles.length > 0) {
          this._roles.set(res.roles);
          this._permissions.set(res.permissions ?? []);
        } else {
          this._roles.set(['ROLE_DEFAULT']);
          this._permissions.set(res.permissions ?? []);
        }
        this._id.set(user.userId ?? null);
        this._name.set(user.userName ?? '');
        this._nickName.set(user.nickName ?? '');
        this._avatar.set(avatar);
        cache.session.set('pwrChrtype', res.pwdChrtype ?? '0');

        if (res.isDefaultModifyPwd) {
          this.message.warning('您的密码还是初始密码，请修改密码！', { nzDuration: 6000 });
        } else if (res.isPasswordExpired) {
          this.message.warning('您的密码已过期，请尽快修改密码！', { nzDuration: 6000 });
        }
      }),
    );
  }

  /** 退出系统 */
  logOut(): Observable<unknown> {
    return this.api.logout().pipe(tap(() => this.clearSession()));
  }

  /** 清理本地会话（401 或退出时使用） */
  clearSession(): void {
    removeToken();
    this._token.set('');
    this._id.set(null);
    this._name.set('');
    this._nickName.set('');
    this._avatar.set('');
    this._roles.set([]);
    this._permissions.set([]);
  }

  /** 是否拥有指定权限 */
  hasPermi(perm: string): boolean {
    const permissions = this._permissions();
    return permissions.includes('*:*:*') || permissions.includes(perm);
  }

  /** 是否拥有任一权限 */
  hasPermiOr(perms: string[]): boolean {
    return perms.some((perm) => this.hasPermi(perm));
  }

  /** 是否拥有指定角色 */
  hasRole(role: string): boolean {
    const roles = this._roles();
    return roles.includes('admin') || roles.includes(role);
  }

  /** 是否拥有任一角色 */
  hasRoleOr(roles: string[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }
}
