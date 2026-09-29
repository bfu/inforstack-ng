import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { RoleApi } from '@api/system/role';
import { SysUser } from '@core/models/system';
import { stubModalService } from '@testing/modal-mock';
import { RoleAuthUser } from './auth-user';

type Mock = ReturnType<typeof vi.fn>;

describe('RoleAuthUser 角色分配用户', () => {
  let api: {
    getRole: Mock;
    allocatedList: Mock;
    unallocatedList: Mock;
    authUserCancelAll: Mock;
    authUserSelectAll: Mock;
  };
  let navigate: Mock;
  let success: Mock;
  let params: Record<string, string>;
  let modal: ReturnType<typeof stubModalService>;

  const allocated: SysUser[] = [{ userId: 1, userName: 'admin', nickName: '超级管理员' }];
  const unallocated: SysUser[] = [
    { userId: 2, userName: 'ry', nickName: '若依' },
    { userId: 3, userName: 'test', nickName: '测试' },
  ];

  beforeEach(() => {
    api = {
      getRole: vi.fn(() => of({ code: 200, msg: '', data: { roleId: 5, roleName: '普通角色' } })),
      allocatedList: vi.fn(() => of({ code: 200, msg: '', rows: allocated, total: 1 })),
      unallocatedList: vi.fn(() => of({ code: 200, msg: '', rows: unallocated, total: 2 })),
      authUserCancelAll: vi.fn(() => of({ code: 200, msg: '' })),
      authUserSelectAll: vi.fn(() => of({ code: 200, msg: '' })),
    };
    navigate = vi.fn();
    success = vi.fn();
    params = { roleId: '5' };
    TestBed.configureTestingModule({
      providers: [
        { provide: RoleApi, useValue: api },
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
        { provide: NzModalService, useValue: {} },
        { provide: NzMessageService, useValue: { success, error: vi.fn(), warning: vi.fn() } },
      ],
    });
  });

  function create(): RoleAuthUser {
    const fixture = TestBed.createComponent(RoleAuthUser);
    modal = stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 加载角色与两张表', () => {
    const page = create();

    expect(api.getRole).toHaveBeenCalledWith(5);
    expect(page.role().roleName).toBe('普通角色');
    expect(api.allocatedList).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: 5, pageNum: 1, pageSize: 10 }),
    );
    expect(api.unallocatedList).toHaveBeenCalledTimes(1);
    expect(page.allocated()).toEqual(allocated);
    expect(page.unallocated()).toEqual(unallocated);
  });

  it('缺少 roleId 时不发请求', () => {
    params = {};
    create();

    expect(api.getRole).not.toHaveBeenCalled();
    expect(api.allocatedList).not.toHaveBeenCalled();
  });

  it('search 同时刷新两张表并回到第一页', () => {
    const page = create();
    page.searchForm.patchValue({ userName: 'ry' });

    page.search();

    expect(api.allocatedList).toHaveBeenLastCalledWith(
      expect.objectContaining({ userName: 'ry', pageNum: 1 }),
    );
    expect(api.allocatedList).toHaveBeenCalledTimes(2);
    expect(api.unallocatedList).toHaveBeenCalledTimes(2);
  });

  it('selectOne 授权单个用户后刷新', () => {
    const page = create();

    page.selectOne(unallocated[0]);

    expect(api.authUserSelectAll).toHaveBeenCalledWith(5, '2');
    expect(success).toHaveBeenCalledWith('授权成功');
    expect(api.allocatedList).toHaveBeenCalledTimes(2);
  });

  it('selectAll 批量授权勾选的未分配用户', () => {
    const page = create();
    page.onChecked('unallocated', 2, true);
    page.onChecked('unallocated', 3, true);

    page.selectAll();

    expect(api.authUserSelectAll).toHaveBeenCalledWith(5, '2,3');
  });

  it('cancelAll 未勾选时不弹确认框', () => {
    const page = create();

    page.cancelAll();

    expect(modal.confirm).not.toHaveBeenCalled();
    expect(api.authUserCancelAll).not.toHaveBeenCalled();
  });

  it('cancelAll 确认后批量取消授权', () => {
    const page = create();
    page.onChecked('allocated', 1, true);

    page.cancelAll();

    expect(api.authUserCancelAll).toHaveBeenCalledWith(5, '1');
    expect(success).toHaveBeenCalledWith('取消授权成功');
  });

  it('cancelAll 取消确认时不调接口', () => {
    const page = create();
    page.onChecked('allocated', 1, true);
    modal.setMode('cancel');

    page.cancelAll();

    expect(api.authUserCancelAll).not.toHaveBeenCalled();
  });

  it('cancelOne 取消单个用户授权', () => {
    const page = create();

    page.cancelOne(allocated[0]);

    expect(api.authUserCancelAll).toHaveBeenCalledWith(5, '1');
  });

  it('close 返回角色列表', () => {
    const page = create();

    page.close();

    expect(navigate).toHaveBeenCalledWith(['/system/role']);
  });
});
