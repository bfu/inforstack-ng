import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { RoleApi } from '@api/system/role';
import { SysMenuApi } from '@api/system/menu';
import { DownloadService } from '@core/download.service';
import { SysRole } from '@core/models/system';
import { DictStore } from '@store/dict.store';
import { UserStore } from '@store/user.store';
import { stubModalService } from '@testing/modal-mock';
import { RolePage } from './role';

type Mock = ReturnType<typeof vi.fn>;

describe('RolePage 角色管理', () => {
  let api: {
    listRole: Mock;
    addRole: Mock;
    updateRole: Mock;
    delRole: Mock;
    changeStatus: Mock;
    deptTree: Mock;
    dataScope: Mock;
  };
  let menuApi: {
    treeselect: Mock;
    roleMenuTreeselect: Mock;
  };
  let download: Mock;
  let navigate: Mock;
  let success: Mock;
  let getDict: Mock;
  let loadDict: Mock;
  /** 弹窗桩：confirm 与最近一次确认配置（用于触发取消回调） */
  let modal: ReturnType<typeof stubModalService>;

  const roles: SysRole[] = [
    { roleId: 1, roleName: '超级管理员', roleKey: 'admin', roleSort: 1, status: '0' },
    { roleId: 2, roleName: '普通角色', roleKey: 'common', roleSort: 2, status: '1' },
  ];

  beforeEach(() => {
    api = {
      listRole: vi.fn(() => of({ code: 200, msg: '', rows: roles, total: 2 })),
      addRole: vi.fn(() => of({ code: 200, msg: '' })),
      updateRole: vi.fn(() => of({ code: 200, msg: '' })),
      delRole: vi.fn(() => of({ code: 200, msg: '' })),
      changeStatus: vi.fn(() => of({ code: 200, msg: '' })),
      deptTree: vi.fn(() => of({ code: 200, msg: '', depts: [], checkedKeys: [100] })),
      dataScope: vi.fn(() => of({ code: 200, msg: '' })),
    };
    menuApi = {
      treeselect: vi.fn(() => of({ code: 200, msg: '', data: [] })),
      roleMenuTreeselect: vi.fn(() => of({ code: 200, msg: '', menus: [], checkedKeys: [1, 2] })),
    };
    download = vi.fn(() => of(undefined));
    navigate = vi.fn();
    success = vi.fn();
    getDict = vi.fn(() => [{ label: '正常', value: '0', listClass: 'primary' }]);
    loadDict = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        provideNzDateFnsAdapter(),
        { provide: RoleApi, useValue: api },
        { provide: SysMenuApi, useValue: menuApi },
        { provide: DownloadService, useValue: { download } },
        { provide: NzModalService, useValue: {} },
        { provide: NzMessageService, useValue: { success, error: vi.fn(), warning: vi.fn() } },
        { provide: Router, useValue: { navigate } },
        {
          provide: DictStore,
          useValue: {
            getDict,
            loadDict,
            setDict: vi.fn(),
            removeDict: vi.fn(),
            cleanDict: vi.fn(),
          },
        },
        {
          provide: UserStore,
          useValue: { hasPermi: vi.fn(() => true), hasRole: vi.fn(() => true) },
        },
      ],
    });
  });

  async function create(): Promise<RolePage> {
    const fixture = TestBed.createComponent(RolePage);
    modal = stubModalService(fixture.debugElement);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  it('ngOnInit 首查并加载两个字典', async () => {
    getDict.mockReturnValue(null);
    const page = await create();

    expect(api.listRole).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      roleName: undefined,
      roleKey: undefined,
      status: undefined,
    });
    expect(loadDict).toHaveBeenCalledWith('sys_normal_disable');
    expect(loadDict).toHaveBeenCalledWith('sys_data_scope');
    expect(page.rows()).toEqual(roles);
  });

  it('日期范围转为 params 时间参数', async () => {
    const page = await create();
    page.dateRange.set([new Date(2024, 0, 2), new Date(2024, 0, 31)]);
    page.getList();

    const query = api.listRole.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(query['params[beginTime]']).toBe('2024-01-02');
    expect(query['params[endTime]']).toBe('2024-01-31');
  });

  it('openAdd 拉取菜单树后打开弹窗', async () => {
    const page = await create();

    page.openAdd();

    expect(menuApi.treeselect).toHaveBeenCalledTimes(1);
    expect(page.dialogTitle()).toBe('添加角色');
    expect(page.dialogVisible()).toBe(true);
  });

  it('openEdit 回填并拉取已勾选菜单', async () => {
    const page = await create();

    page.openEdit(roles[1]);

    expect(menuApi.roleMenuTreeselect).toHaveBeenCalledWith(2);
    expect(page.checkedMenuKeys()).toEqual(['1', '2']);
    expect(page.dialogTitle()).toBe('修改角色');
  });

  it('新增提交：勾选菜单映射为 menuIds', async () => {
    const page = await create();

    page.openAdd();
    page.form.patchValue({ roleName: '新角色', roleKey: 'new', roleSort: 3 });
    page.onMenuCheck({ keys: ['1', '3'] } as never);
    page.submitForm();

    expect(api.addRole).toHaveBeenCalledWith(
      expect.objectContaining({ roleName: '新角色', menuIds: [1, 3] }),
    );
    expect(success).toHaveBeenCalledWith('新增成功');
  });

  it('statusChange：确认后调 changeStatus', async () => {
    const page = await create();

    page.statusChange(roles[1], true);

    expect(page.rows()[1].status).toBe('0');
    expect(api.changeStatus).toHaveBeenCalledWith(2, '0');
    expect(success).toHaveBeenCalledWith('启用成功');
  });

  it('statusChange：失败时回滚行状态', async () => {
    api.changeStatus.mockReturnValue(throwError(() => new Error('boom')));
    const page = await create();

    page.statusChange(roles[0], false);

    expect(page.rows()[0].status).toBe('0');
  });

  it('statusChange：取消时回滚行状态且不调接口', async () => {
    const page = await create();
    modal.setMode('cancel');

    page.statusChange(roles[0], false);

    expect(page.rows()[0].status).toBe('0');
    expect(api.changeStatus).not.toHaveBeenCalled();
  });

  it('openDataScope 拉取部门树并打开弹窗', async () => {
    const page = await create();

    page.openDataScope(roles[1]);

    expect(api.deptTree).toHaveBeenCalledWith(2);
    expect(page.scopeVisible()).toBe(true);
    expect(page.checkedDeptKeys()).toEqual(['100']);
  });

  it('submitDataScope 提交数据权限', async () => {
    const page = await create();

    page.openDataScope(roles[1]);
    page.onDeptCheck({ keys: ['100', '101'] } as never);
    page.submitDataScope();

    expect(api.dataScope).toHaveBeenCalledWith(2, '1', [100, 101]);
    expect(success).toHaveBeenCalledWith('设置成功');
    expect(page.scopeVisible()).toBe(false);
  });

  it('authUser 跳转授权用户页', async () => {
    const page = await create();

    page.authUser(roles[1]);

    expect(navigate).toHaveBeenCalledWith(['/system/role-auth/user', 2]);
  });

  it('删除：确认后调 delRole 并刷新', async () => {
    const page = await create();
    api.listRole.mockClear();

    page.delete(roles[1]);

    expect(api.delRole).toHaveBeenCalledWith([2]);
    expect(success).toHaveBeenCalledWith('删除成功');
    expect(api.listRole).toHaveBeenCalledTimes(1);
  });

  it('导出剥离分页参数', async () => {
    const page = await create();

    page.export();

    expect(download).toHaveBeenCalledWith(
      '/system/role/export',
      { roleName: undefined, roleKey: undefined, status: undefined },
      expect.stringMatching(/^role_\d{14}\.xlsx$/),
    );
  });
});
