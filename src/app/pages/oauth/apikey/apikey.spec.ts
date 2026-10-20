import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { OauthApiKeyApi } from '@api/oauth/apikey';
import { UserApi } from '@api/system/user';
import { stubModalService } from '@testing/modal-mock';
import { OauthApiKey } from '@core/models/oauth';
import { ApikeyPage } from './apikey';

type Mock = ReturnType<typeof vi.fn>;

describe('ApikeyPage API Key 授权管理', () => {
  let listKey: Mock;
  let getKey: Mock;
  let addKey: Mock;
  let updateKey: Mock;
  let resetKey: Mock;
  let delKey: Mock;
  let listUser: Mock;
  let success: Mock;
  let modal: ReturnType<typeof stubModalService> | undefined;

  const keys: OauthApiKey[] = [
    {
      keyId: 1,
      name: '第三方报表系统',
      userId: 2,
      userName: 'zhangsan',
      status: '0',
      expiresTime: '2026-12-31 23:59:59',
      lastUsedTime: '2026-10-21 01:00:00',
    },
    { keyId: 2, name: '永久密钥', userId: 1, userName: 'admin', status: '1' },
  ];

  beforeEach(() => {
    listKey = vi.fn(() => of({ code: 200, msg: '', rows: keys, total: 2 }));
    getKey = vi.fn(() => of({ code: 200, msg: '', data: keys[0] }));
    addKey = vi.fn(() => of({ code: 200, msg: '操作成功', apiKey: 'rak_newkey' }));
    updateKey = vi.fn(() => of({ code: 200, msg: '操作成功' }));
    resetKey = vi.fn(() => of({ code: 200, msg: '操作成功', apiKey: 'rak_resetkey' }));
    delKey = vi.fn(() => of({ code: 200, msg: '' }));
    listUser = vi.fn(() =>
      of({
        code: 200,
        msg: '',
        rows: [{ userId: 1, userName: 'admin', nickName: '管理员' }],
        total: 1,
      }),
    );
    success = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: OauthApiKeyApi,
          useValue: { listKey, getKey, addKey, updateKey, resetKey, delKey },
        },
        { provide: UserApi, useValue: { listUser } },
        {
          provide: NzMessageService,
          useValue: { success, error: vi.fn(), warning: vi.fn() },
        },
      ],
    });
  });

  function create(): ApikeyPage {
    const fixture = TestBed.createComponent(ApikeyPage);
    modal = stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 发起首查', () => {
    const page = create();

    expect(listKey).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      name: undefined,
      status: undefined,
    });
    expect(page.rows()).toEqual(keys);
    expect(page.total()).toBe(2);
  });

  it('statusMeta 与 expiresLabel 展示', () => {
    const page = create();

    expect(page.statusMeta('0').label).toBe('正常');
    expect(page.statusMeta('1').label).toBe('停用');
    expect(page.expiresLabel('2026-12-31 23:59:59')).toBe('2026-12-31 23:59:59');
    expect(page.expiresLabel(undefined)).toBe('永久');
  });

  it('新增成功后展示明文密钥（仅一次可见）', () => {
    const page = create();
    listKey.mockClear();

    page.openAdd();
    page.editorForm.patchValue({ name: '新密钥', userId: 2 });
    page.submitEditor();

    expect(addKey).toHaveBeenCalledTimes(1);
    expect(addKey).toHaveBeenCalledWith(
      expect.objectContaining({ name: '新密钥', userId: 2, status: '0', expiresTime: null }),
    );
    // 明文不在库里，必须立即展示供复制
    expect(page.keyVisible()).toBe(true);
    expect(page.keyText()).toBe('rak_newkey');
    expect(listKey).toHaveBeenCalledTimes(1);
  });

  it('编辑回填数据并转换为 Date，提交走 updateKey', () => {
    const page = create();

    page.openEdit(keys[0]);
    expect(getKey).toHaveBeenCalledWith(1);
    expect(page.editorForm.controls.name.value).toBe('第三方报表系统');
    expect(page.editorForm.controls.expiresTime.value).toBeInstanceOf(Date);
    expect(page.editorTitle()).toBe('修改密钥');

    page.submitEditor();
    expect(updateKey).toHaveBeenCalledWith(
      expect.objectContaining({
        keyId: 1,
        expiresTime: '2026-12-31 23:59:59',
      }),
    );
    // 修改不返回明文，不弹密钥展示框
    expect(page.keyVisible()).toBe(false);
    expect(success).toHaveBeenCalledWith('保存成功');
  });

  it('清空过期时间时提交 null（永久有效）', () => {
    const page = create();

    page.openEdit(keys[0]);
    page.editorForm.patchValue({ expiresTime: null });
    page.submitEditor();

    expect(updateKey).toHaveBeenCalledWith(expect.objectContaining({ expiresTime: null }));
  });

  it('表单非法时不发起提交', () => {
    const page = create();

    page.openAdd();
    page.editorForm.patchValue({ name: '', userId: undefined });
    page.submitEditor();

    expect(addKey).not.toHaveBeenCalled();
  });

  it('重置走确认框并展示新明文密钥', () => {
    const page = create();
    listKey.mockClear();

    page.resetKey(keys[0]);

    expect(modal?.lastConfig()?.nzTitle).toBe('重置密钥');
    expect(resetKey).toHaveBeenCalledWith(1);
    expect(page.keyVisible()).toBe(true);
    expect(page.keyText()).toBe('rak_resetkey');
    expect(listKey).toHaveBeenCalledTimes(1);
  });

  it('删除走确认框并调用 delKey', () => {
    const page = create();
    listKey.mockClear();

    page.deleteKey(keys[0]);

    expect(delKey).toHaveBeenCalledWith([1]);
    expect(success).toHaveBeenCalledWith('删除成功');
  });

  it('打开新增时加载绑定用户下拉', () => {
    const page = create();

    page.openAdd();
    expect(listUser).toHaveBeenCalledTimes(1);
    expect(page.userOptions()).toEqual([{ value: 1, label: '管理员（admin）' }]);
  });

  it('用户列表加载失败时降级为手动输入用户ID', () => {
    listUser.mockImplementation(() => throwError(() => new Error('no permission')));
    const page = create();

    page.openAdd();
    expect(page.userOptionsFailed()).toBe(true);
  });

  it('新增接口返回异常时不展示密钥框', () => {
    addKey.mockImplementation(() => throwError(() => new Error('add failed')));
    const page = create();

    page.openAdd();
    page.editorForm.patchValue({ name: '新密钥', userId: 2 });
    page.submitEditor();

    expect(page.keyVisible()).toBe(false);
    expect(page.editorSubmitting()).toBe(false);
  });
});
