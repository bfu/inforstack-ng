import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { UserApi } from '@api/system/user';
import { SysRole } from '@core/models/system';
import { UserAuthRole } from './auth-role';

type Mock = ReturnType<typeof vi.fn>;

describe('UserAuthRole 用户分配角色', () => {
  let getAuthRole: Mock;
  let updateAuthRole: Mock;
  let navigate: Mock;
  let success: Mock;
  let params: Record<string, string>;

  const roles: SysRole[] = [
    { roleId: 1, roleName: '超级管理员', roleKey: 'admin', flag: true, status: '0' },
    { roleId: 2, roleName: '普通角色', roleKey: 'common', flag: false, status: '0' },
  ];

  beforeEach(() => {
    getAuthRole = vi.fn(() =>
      of({
        code: 200,
        msg: '',
        user: { userId: 100, userName: 'ry', nickName: '若依' },
        roles,
      }),
    );
    updateAuthRole = vi.fn(() => of({ code: 200, msg: '' }));
    navigate = vi.fn();
    success = vi.fn();
    params = { userId: '100' };
    TestBed.configureTestingModule({
      providers: [
        { provide: UserApi, useValue: { getAuthRole, updateAuthRole } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get paramMap() {
                return convertToParamMap(params);
              },
            },
          },
        },
        { provide: Router, useValue: { navigate } },
        { provide: NzMessageService, useValue: { success, error: vi.fn(), warning: vi.fn() } },
      ],
    });
  });

  function create(): UserAuthRole {
    const fixture = TestBed.createComponent(UserAuthRole);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 加载用户与角色，flag 为 true 的角色自动勾选', () => {
    const page = create();

    expect(getAuthRole).toHaveBeenCalledWith('100');
    expect(page.user().userName).toBe('ry');
    expect(page.roles()).toEqual(roles);
    expect(page.selection.isChecked(roles[0])).toBe(true);
    expect(page.selection.isChecked(roles[1])).toBe(false);
    expect(page.loading()).toBe(false);
  });

  it('缺少 userId 时不发请求', () => {
    params = {};
    const page = create();

    expect(getAuthRole).not.toHaveBeenCalled();
    expect(page.roles()).toEqual([]);
  });

  it('submit 提交已勾选角色并返回用户列表', () => {
    const page = create();
    page.selection.onItemChecked(2, true);

    page.submit();

    expect(updateAuthRole).toHaveBeenCalledWith('100', '1,2');
    expect(success).toHaveBeenCalledWith('授权成功');
    expect(navigate).toHaveBeenCalledWith(['/system/user']);
  });

  it('close 直接返回用户列表', () => {
    const page = create();

    page.close();

    expect(navigate).toHaveBeenCalledWith(['/system/user']);
    expect(updateAuthRole).not.toHaveBeenCalled();
  });
});
