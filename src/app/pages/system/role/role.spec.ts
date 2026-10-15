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
import { TreeSelectNode } from '@core/models/result';
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

  /** 菜单树夹具：1 系统管理 ├ 100 角色管理 ├ 1001 角色查询 / 1002 角色新增 └ 200 菜单管理 └ 2001 */
  const menuTree: TreeSelectNode[] = [
    {
      id: 1,
      label: '系统管理',
      children: [
        {
          id: 100,
          label: '角色管理',
          children: [
            { id: 1001, label: '角色查询' },
            { id: 1002, label: '角色新增' },
          ],
        },
        { id: 200, label: '菜单管理', children: [{ id: 2001, label: '菜单查询' }] },
      ],
    },
  ];

  /** 部门树夹具：100 总公司 ├ 101 研发部门 └ 102 市场部门 */
  const deptTree: TreeSelectNode[] = [
    {
      id: 100,
      label: '总公司',
      children: [
        { id: 101, label: '研发部门' },
        { id: 102, label: '市场部门' },
      ],
    },
  ];

  beforeEach(() => {
    api = {
      listRole: vi.fn(() => of({ code: 200, msg: '', rows: roles, total: 2 })),
      addRole: vi.fn(() => of({ code: 200, msg: '' })),
      updateRole: vi.fn(() => of({ code: 200, msg: '' })),
      delRole: vi.fn(() => of({ code: 200, msg: '' })),
      changeStatus: vi.fn(() => of({ code: 200, msg: '' })),
      deptTree: vi.fn(() => of({ code: 200, msg: '', depts: deptTree, checkedKeys: [101] })),
      dataScope: vi.fn(() => of({ code: 200, msg: '' })),
    };
    menuApi = {
      treeselect: vi.fn(() => of({ code: 200, msg: '', data: menuTree })),
      roleMenuTreeselect: vi.fn(() =>
        of({ code: 200, msg: '', menus: menuTree, checkedKeys: [1001] }),
      ),
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

  it('openEdit 回填：勾选写进节点 checked，非叶子键不写（否则会连带勾选整棵子树）', async () => {
    const page = await create();

    page.openEdit(roles[1]);

    expect(menuApi.roleMenuTreeselect).toHaveBeenCalledWith(2);
    expect(page.dialogTitle()).toBe('修改角色');
    expect(page.menuCheckStrictly()).toBe(true);
    expect(page.checkedMenuKeys()).toEqual(['1001']);
    expect(page.menuNodes()[0].children?.[0].children?.[0].checked).toBe(true);
    expect(page.menuNodes()[0].children?.[0].checked).toBe(false);
  });

  it('打开弹窗的初始三控件状态对齐 RuoYi：菜单树收起、部门树展开', async () => {
    const page = await create();

    page.openAdd();
    expect(page.menuExpand()).toBe(false);
    expect(page.menuNodeAll()).toBe(false);
    expect(page.menuExpandedKeys()).toEqual([]);
    expect(page.menuNodes()[0].expanded).toBe(false);

    page.openDataScope(roles[1]);
    expect(page.deptExpand()).toBe(true);
    expect(page.deptNodeAll()).toBe(false);
    // el-tree 的 default-expand-all ⇒ 全量展开
    expect(page.deptExpandedKeys()).toEqual(['100', '101', '102']);
    expect(page.deptNodes()[0].expanded).toBe(true);
    expect(page.deptNodes()[0].children?.[0].expanded).toBe(true);
  });

  it('展开/折叠：只作用于根级，且折叠后仍能再展开', async () => {
    const page = await create();
    page.openAdd();

    page.toggleMenuExpand(true);
    expect(page.menuExpand()).toBe(true);
    expect(page.menuExpandedKeys()).toEqual(['1']);
    expect(page.menuNodes()[0].expanded).toBe(true);

    page.toggleMenuExpand(false);
    expect(page.menuExpand()).toBe(false);
    expect(page.menuExpandedKeys()).toEqual([]);
    expect(page.menuNodes()[0].expanded).toBe(false);
  });

  it('展开/折叠：更深的节点保留各自的展开状态（对齐 RuoYi 只改根级）', async () => {
    const page = await create();
    page.openAdd();

    // 模拟用户手动把根和一级都展开
    page.onMenuExpandChange({ keys: ['1', '100'] } as never);
    page.toggleMenuExpand(false);

    expect(page.menuExpandedKeys()).toEqual(['100']);
    expect(page.menuNodes()[0].expanded).toBe(false);
    expect(page.menuNodes()[0].children?.[0].expanded).toBe(true);
  });

  it('全选：树全勾且提交全量菜单', async () => {
    const page = await create();
    page.openAdd();
    page.form.patchValue({ roleName: '新角色', roleKey: 'new', roleSort: 3 });

    page.toggleMenuNodes(true);
    expect(page.menuNodeAll()).toBe(true);
    // 联动模式下非叶子仍不写 checked（否则 nzData 的 checked 会向下传播整棵子树），
    // 但它们进 carried，提交时仍是全量；视觉上 conductUp 会把父节点标成全选
    expect(page.menuNodes()[0].checked).toBe(false);
    expect(page.menuNodes()[0].children?.[0].children?.[0].checked).toBe(true);
    expect(page.menuNodes()[0].children?.[0].children?.[1].checked).toBe(true);
    expect(page.menuNodes()[0].children?.[1].children?.[0].checked).toBe(true);

    page.submitForm();
    expect(api.addRole).toHaveBeenCalledWith(
      expect.objectContaining({ menuIds: [1, 100, 200, 1001, 1002, 2001] }),
    );
  });

  it('全不选：清空勾选并清掉 carried（否则「全不选」提交后权限仍在）', async () => {
    // 回填一个非叶键 100 ⇒ 它进 carried；点全不选后必须一起清掉
    menuApi.roleMenuTreeselect.mockReturnValue(
      of({ code: 200, msg: '', menus: menuTree, checkedKeys: [100] }),
    );
    const page = await create();
    page.openEdit(roles[1]);

    page.toggleMenuNodes(false);

    expect(page.menuNodeAll()).toBe(false);
    expect(page.checkedMenuKeys()).toEqual([]);
    expect(page.menuNodes()[0].children?.[0].checked).toBe(false);
    page.submitForm();
    expect(api.updateRole).toHaveBeenCalledWith(expect.objectContaining({ menuIds: [] }));
  });

  it('全选/全不选复选框与树的实际勾选保持一致', async () => {
    const page = await create();
    page.openAdd();

    page.onMenuCheck({ keys: ['1', '100', '1001', '1002', '200', '2001'] } as never);
    expect(page.menuNodeAll()).toBe(true);

    page.onMenuCheck({ keys: ['1001'] } as never);
    expect(page.menuNodeAll()).toBe(false);
  });

  it('父子联动：切到不联动时按当前集合精确提交，不补祖先', async () => {
    const page = await create();
    page.openEdit(roles[1]);

    page.setMenuCheckStrictly(false);

    expect(page.menuCheckStrictly()).toBe(false);
    // 联动时 payload 是 [1,100,1001]；切到不联动后树上直接勾上三者，提交结果不变
    expect([...page.checkedMenuKeys()].sort()).toEqual(['1', '100', '1001']);
    page.submitForm();
    const menuIds = api.updateRole.mock.calls.at(-1)?.[0].menuIds as number[];
    expect([...menuIds].sort((a, b) => a - b)).toEqual([1, 100, 1001]);
    expect(api.updateRole).toHaveBeenCalledWith(
      expect.objectContaining({ menuCheckStrictly: false }),
    );
  });

  it('父子联动：切回联动时不放大权限（非叶键退回 carried）', async () => {
    menuApi.roleMenuTreeselect.mockReturnValue(
      of({ code: 200, msg: '', menus: menuTree, checkedKeys: [100, 1001] }),
    );
    const page = await create();
    page.openEdit({ ...roles[1], menuCheckStrictly: false });

    page.setMenuCheckStrictly(true);

    expect(page.menuCheckStrictly()).toBe(true);
    expect(page.checkedMenuKeys()).toEqual(['1001']);
    // 非叶子 100 不能在树上置 checked：ng-zorro 会 conductDown 把它整棵子树勾上
    expect(page.menuNodes()[0].children?.[0].checked).toBe(false);
    page.submitForm();
    const menuIds = api.updateRole.mock.calls.at(-1)?.[0].menuIds as number[];
    expect([...menuIds].sort((a, b) => a - b)).toEqual([1, 100, 1001]);
    expect(api.updateRole).toHaveBeenCalledWith(
      expect.objectContaining({ menuCheckStrictly: true }),
    );
  });

  it('新增提交：勾选叶子时补上全部祖先（半选父节点）', async () => {
    const page = await create();

    page.openAdd();
    page.form.patchValue({ roleName: '新角色', roleKey: 'new', roleSort: 3 });
    page.onMenuCheck({ keys: ['1001'] } as never);
    page.submitForm();

    // 只勾了叶子 1001，但父节点 100 / 1 必须一起提交，否则侧边栏断链
    expect(api.addRole).toHaveBeenCalledWith(
      expect.objectContaining({ roleName: '新角色', menuIds: [1, 100, 1001] }),
    );
    expect(success).toHaveBeenCalledWith('新增成功');
  });

  it('修改提交：回填后不动任何东西直接保存必须幂等', async () => {
    // 只授权了「角色管理」页面、未授权其下任何按钮 ⇒ 后端 menu_check_strictly=1 会把
    // 非叶子的 100 原样返回。前端不能在树上给它置 checked（会连带勾选按钮、权限被放大），
    // 也不能丢弃它（会删掉整个页面菜单）
    menuApi.roleMenuTreeselect.mockReturnValue(
      of({ code: 200, msg: '', menus: menuTree, checkedKeys: [100] }),
    );
    const page = await create();

    page.openEdit(roles[1]);
    page.submitForm();

    expect(api.updateRole).toHaveBeenCalledWith(expect.objectContaining({ menuIds: [100] }));
  });

  it('不联动模式（menu_check_strictly=0）：按树上精确集合提交，不补祖先', async () => {
    menuApi.roleMenuTreeselect.mockReturnValue(
      of({ code: 200, msg: '', menus: menuTree, checkedKeys: [100, 1001] }),
    );
    const page = await create();

    page.openEdit({ ...roles[1], menuCheckStrictly: false });

    expect(page.menuCheckStrictly()).toBe(false);
    expect(page.checkedMenuKeys()).toEqual(['100', '1001']);
    expect(page.menuNodes()[0].children?.[0].checked).toBe(true);

    page.submitForm();

    expect(api.updateRole).toHaveBeenCalledWith(expect.objectContaining({ menuIds: [100, 1001] }));
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
    expect(page.deptCheckStrictly()).toBe(true);
    expect(page.checkedDeptKeys()).toEqual(['101']);
  });

  it('submitDataScope 提交数据权限时补上父部门', async () => {
    const page = await create();

    page.openDataScope(roles[1]);
    page.onDeptCheck({ keys: ['101'] } as never);
    page.submitDataScope();

    // 与菜单树同构：只勾了子部门 101，父部门 100 也必须一起提交
    expect(api.dataScope).toHaveBeenCalledWith(2, '1', [100, 101], true);
    expect(success).toHaveBeenCalledWith('设置成功');
    expect(page.scopeVisible()).toBe(false);
  });

  it('submitDataScope：回填后不动直接保存必须幂等（非叶部门授权不丢）', async () => {
    api.deptTree.mockReturnValue(of({ code: 200, msg: '', depts: deptTree, checkedKeys: [100] }));
    const page = await create();

    page.openDataScope(roles[1]);
    page.submitDataScope();

    expect(api.dataScope).toHaveBeenCalledWith(2, '1', [100], true);
  });

  it('部门树展开/折叠：只作用于根级，深层节点保留展开状态', async () => {
    const page = await create();
    page.openDataScope(roles[1]);

    page.toggleDeptExpand(false);
    expect(page.deptExpand()).toBe(false);
    expect(page.deptExpandedKeys()).toEqual(['101', '102']);
    expect(page.deptNodes()[0].expanded).toBe(false);
    expect(page.deptNodes()[0].children?.[0].expanded).toBe(true);

    page.toggleDeptExpand(true);
    expect(page.deptExpandedKeys()).toEqual(['101', '102', '100']);
    expect(page.deptNodes()[0].expanded).toBe(true);
  });

  it('部门树全选/全不选', async () => {
    const page = await create();
    page.openDataScope(roles[1]);

    page.toggleDeptNodes(true);
    expect(page.deptNodeAll()).toBe(true);
    page.submitDataScope();
    expect(api.dataScope).toHaveBeenCalledWith(2, '1', [100, 101, 102], true);

    page.toggleDeptNodes(false);
    expect(page.deptNodeAll()).toBe(false);
    expect(page.checkedDeptKeys()).toEqual([]);
  });

  it('部门树父子联动：切换后提交结果不变，且联动开关落库', async () => {
    const page = await create();
    page.openDataScope(roles[1]);

    page.setDeptCheckStrictly(false);

    expect(page.deptCheckStrictly()).toBe(false);
    expect([...page.checkedDeptKeys()].sort()).toEqual(['100', '101']);
    page.submitDataScope();
    expect(api.dataScope).toHaveBeenCalledWith(2, '1', [100, 101], false);
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
