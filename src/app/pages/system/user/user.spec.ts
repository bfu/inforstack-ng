import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { UserApi } from '@api/system/user';
import { DownloadService } from '@core/download.service';
import { SysUser } from '@core/models/system';
import { DictStore } from '@store/dict.store';
import { UserStore } from '@store/user.store';
import { stubModalService } from '@testing/modal-mock';
import { UserPage } from './user';

type Mock = ReturnType<typeof vi.fn>;

describe('UserPage 用户管理', () => {
  let api: {
    listUser: Mock;
    getUser: Mock;
    addUser: Mock;
    updateUser: Mock;
    delUser: Mock;
    resetUserPwd: Mock;
    changeUserStatus: Mock;
    importData: Mock;
    deptTreeSelect: Mock;
  };
  let download: Mock;
  let navigate: Mock;
  let success: Mock;
  let warning: Mock;
  let error: Mock;
  let getDict: Mock;
  let loadDict: Mock;
  let modal: ReturnType<typeof stubModalService>;

  const users: SysUser[] = [
    { userId: 1, userName: 'admin', nickName: '超级管理员', status: '0' },
    { userId: 2, userName: 'ry', nickName: '若依', status: '1' },
  ];

  beforeEach(() => {
    api = {
      listUser: vi.fn(() => of({ code: 200, msg: '', rows: users, total: users.length })),
      getUser: vi.fn(() =>
        of({ code: 200, msg: '', posts: [{ postId: 1, postName: '董事长' }], roles: [] }),
      ),
      addUser: vi.fn(() => of({ code: 200, msg: '' })),
      updateUser: vi.fn(() => of({ code: 200, msg: '' })),
      delUser: vi.fn(() => of({ code: 200, msg: '' })),
      resetUserPwd: vi.fn(() => of({ code: 200, msg: '' })),
      changeUserStatus: vi.fn(() => of({ code: 200, msg: '' })),
      importData: vi.fn(() => of({ code: 200, msg: '导入成功' })),
      deptTreeSelect: vi.fn(() =>
        of({ code: 200, msg: '', data: [{ id: 100, parentId: 0, label: '总公司' }] }),
      ),
    };
    download = vi.fn(() => of(undefined));
    navigate = vi.fn();
    success = vi.fn();
    warning = vi.fn();
    error = vi.fn();
    getDict = vi.fn(() => [{ label: '正常', value: '0', listClass: 'primary' }]);
    loadDict = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: UserApi, useValue: api },
        { provide: DownloadService, useValue: { download } },
        { provide: NzModalService, useValue: {} },
        { provide: NzMessageService, useValue: { success, warning, error } },
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

  function create(): UserPage {
    const fixture = TestBed.createComponent(UserPage);
    modal = stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 首查、加载部门树与两个字典', () => {
    getDict.mockReturnValue(null);
    const page = create();

    expect(api.deptTreeSelect).toHaveBeenCalledTimes(1);
    expect(page.deptNodes()).toHaveLength(1);
    expect(page.deptNodes()[0].key).toBe('100');
    expect(loadDict).toHaveBeenCalledWith('sys_normal_disable');
    expect(loadDict).toHaveBeenCalledWith('sys_user_sex');
    expect(api.listUser).toHaveBeenCalledWith(
      expect.objectContaining({ pageNum: 1, pageSize: 10, deptId: undefined }),
    );
    expect(page.rows()).toEqual(users);
  });

  it('点击部门树按部门筛选并回到第一页', () => {
    const page = create();
    page.pageNum.set(3);

    page.onDeptSelect({ node: { key: '100' } } as never);

    expect(page.deptId()).toBe(100);
    expect(page.pageNum()).toBe(1);
    expect(api.listUser).toHaveBeenLastCalledWith(expect.objectContaining({ deptId: 100 }));
  });

  it('日期范围经 addDateRange 生成 params 对象', () => {
    const page = create();
    page.dateRange.set([new Date(2024, 0, 2), new Date(2024, 0, 31)]);

    page.getList();

    const query = api.listUser.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    const params = query['params'] as Record<string, unknown>;
    expect(params['beginTime']).toBe('2024-01-02');
    expect(params['endTime']).toBe('2024-01-31');
  });

  it('resetQuery 重置搜索、日期与部门', () => {
    const page = create();
    page.searchForm.patchValue({ userName: 'admin' });
    page.dateRange.set([new Date(), new Date()]);
    page.deptId.set(100);

    page.resetQuery();

    expect(page.searchForm.getRawValue()).toEqual({ userName: '', phonenumber: '', status: '' });
    expect(page.dateRange()).toEqual([]);
    expect(page.deptId()).toBeUndefined();
    expect(page.pageNum()).toBe(1);
  });

  it('openAdd 拉取岗位角色（参数为空串）并打开弹窗', () => {
    const page = create();

    page.openAdd();

    expect(api.getUser).toHaveBeenCalledWith('');
    expect(page.posts()).toHaveLength(1);
    expect(page.dialogTitle()).toBe('添加用户');
    expect(page.dialogVisible()).toBe(true);
  });

  it('openEdit 回填表单', () => {
    api.getUser.mockReturnValue(
      of({
        code: 200,
        msg: '',
        data: { userId: 2, userName: 'ry', nickName: '若依' },
        posts: [],
        roles: [],
        postIds: [1],
        roleIds: [2],
      }),
    );
    const page = create();

    page.openEdit(users[1]);

    expect(api.getUser).toHaveBeenCalledWith(2);
    expect(page.form.controls.nickName.value).toBe('若依');
    expect(page.form.controls.postIds.value).toEqual([1]);
    expect(page.dialogTitle()).toBe('修改用户');
  });

  it('新增提交后调 addUser', () => {
    const page = create();
    api.listUser.mockClear();

    page.openAdd();
    page.form.patchValue({ userName: 'newuser', nickName: '新用户', password: '123456' });
    page.submitForm();

    expect(api.addUser).toHaveBeenCalledWith(
      expect.objectContaining({ userName: 'newuser', nickName: '新用户' }),
    );
    expect(success).toHaveBeenCalledWith('新增成功');
    expect(page.dialogVisible()).toBe(false);
    expect(api.listUser).toHaveBeenCalledTimes(1);
  });

  it('编辑提交后调 updateUser', () => {
    const page = create();

    page.openEdit(users[0]);
    page.submitForm();

    expect(api.updateUser).toHaveBeenCalledWith(expect.objectContaining({ userId: 1 }));
    expect(success).toHaveBeenCalledWith('修改成功');
  });

  it('删除：确认后以逗号拼接 id 调 delUser', () => {
    const page = create();
    api.listUser.mockClear();

    page.delete(users[1]);

    expect(api.delUser).toHaveBeenCalledWith('2');
    expect(success).toHaveBeenCalledWith('删除成功');
    expect(api.listUser).toHaveBeenCalledTimes(1);
  });

  it('批量删除使用勾选行', () => {
    const page = create();

    page.selection.onItemChecked(1, true);
    page.selection.onItemChecked(2, true);
    page.delete();

    expect(api.delUser).toHaveBeenCalledWith('1,2');
  });

  describe('resetPwd', () => {
    it('密码长度不足时提示且不调接口', () => {
      const page = create();

      page.resetPwd(users[0]);
      page.newPassword.set('123');
      const result = modal.createConfig()?.nzOnOk?.();

      expect(warning).toHaveBeenCalledWith('密码长度必须介于 5 和 20 之间');
      expect(api.resetUserPwd).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('密码合法时提交并返回 true', () => {
      const page = create();

      page.resetPwd(users[0]);
      page.newPassword.set('123456');
      const result = modal.createConfig()?.nzOnOk?.();

      expect(api.resetUserPwd).toHaveBeenCalledWith(1, '123456');
      expect(success).toHaveBeenCalledWith('修改成功，新密码是：123456');
      expect(result).toBe(true);
    });
  });

  describe('statusChange', () => {
    it('确认后调 changeUserStatus', () => {
      const page = create();

      page.statusChange(users[1], true);

      expect(page.rows()[1].status).toBe('0');
      expect(api.changeUserStatus).toHaveBeenCalledWith(2, '0');
      expect(success).toHaveBeenCalledWith('启用成功');
    });

    it('取消时回滚行状态且不调接口', () => {
      const page = create();
      modal.setMode('cancel');

      page.statusChange(users[0], false);

      expect(page.rows()[0].status).toBe('0');
      expect(api.changeUserStatus).not.toHaveBeenCalled();
    });

    it('失败时回滚行状态', () => {
      api.changeUserStatus.mockReturnValue(throwError(() => new Error('boom')));
      const page = create();

      page.statusChange(users[0], false);

      expect(page.rows()[0].status).toBe('0');
    });
  });

  it('authRole 跳转分配角色页', () => {
    const page = create();

    page.authRole(users[1]);

    expect(navigate).toHaveBeenCalledWith(['/system/user-auth/role', 2]);
  });

  it('导出剥离分页参数', () => {
    const page = create();

    page.export();

    expect(download).toHaveBeenCalledWith(
      '/system/user/export',
      expect.objectContaining({ userName: undefined }),
      expect.stringMatching(/^user_\d{14}\.xlsx$/),
    );
  });

  describe('importRequest', () => {
    function uploadArgs(): NzUploadXHRArgs {
      return {
        file: new File(['x'], 'user.xlsx'),
        onSuccess: vi.fn(),
        onError: vi.fn(),
      } as unknown as NzUploadXHRArgs;
    }

    it('导入成功回调 onSuccess 并刷新列表', () => {
      const page = create();
      api.listUser.mockClear();
      const args = uploadArgs();

      page.importRequest(args);

      expect(api.importData).toHaveBeenCalledTimes(1);
      expect(args.onSuccess).toHaveBeenCalled();
      expect(success).toHaveBeenCalledWith('导入成功');
      expect(page.importVisible()).toBe(false);
      expect(api.listUser).toHaveBeenCalledTimes(1);
    });

    it('导入失败走 onError 与错误提示', () => {
      api.importData.mockReturnValue(throwError(() => new Error('bad')));
      const page = create();
      page.importVisible.set(true);
      const args = uploadArgs();

      page.importRequest(args);

      expect(args.onError).toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith('导入失败，请检查文件格式');
      expect(page.importVisible()).toBe(true);
    });
  });
});
