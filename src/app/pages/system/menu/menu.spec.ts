import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { SysMenuApi } from '@api/system/menu';
import { SysMenu } from '@core/models/system';
import { DictStore } from '@store/dict.store';
import { UserStore } from '@store/user.store';
import { stubModalService } from '@testing/modal-mock';
import { MenuPage } from './menu';

type Mock = ReturnType<typeof vi.fn>;

describe('MenuPage 菜单管理', () => {
  let listMenu: Mock;
  let treeselect: Mock;
  let addMenu: Mock;
  let updateMenu: Mock;
  let delMenu: Mock;
  let success: Mock;
  let getDict: ReturnType<typeof vi.fn>;
  let loadDict: ReturnType<typeof vi.fn>;

  const flatMenus: SysMenu[] = [
    { menuId: 1, parentId: 0, menuName: '系统管理', menuType: 'M', orderNum: 1 },
    { menuId: 2, parentId: 1, menuName: '用户管理', menuType: 'C', orderNum: 1 },
    { menuId: 3, parentId: 1, menuName: '角色管理', menuType: 'C', orderNum: 2 },
  ];

  beforeEach(() => {
    listMenu = vi.fn(() => of({ code: 200, msg: '', data: flatMenus }));
    treeselect = vi.fn(() => of({ code: 200, msg: '', data: flatMenus }));
    addMenu = vi.fn(() => of({ code: 200, msg: '' }));
    updateMenu = vi.fn(() => of({ code: 200, msg: '' }));
    delMenu = vi.fn(() => of({ code: 200, msg: '' }));
    success = vi.fn();
    getDict = vi.fn(() => [{ label: '正常', value: '0', listClass: 'primary' }]);
    loadDict = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: SysMenuApi, useValue: { listMenu, treeselect, addMenu, updateMenu, delMenu } },
        { provide: NzModalService, useValue: {} },
        { provide: NzMessageService, useValue: { success, error: vi.fn(), warning: vi.fn() } },
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

  function create(): MenuPage {
    const fixture = TestBed.createComponent(MenuPage);
    stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 首查并组装菜单树，三个字典按需加载', () => {
    getDict.mockReturnValue(null);
    const page = create();

    expect(listMenu).toHaveBeenCalledWith({ menuName: undefined, status: undefined });
    expect(page.menuTree()).toHaveLength(1);
    expect(page.menuTree()[0].children).toHaveLength(2);
    expect(loadDict).toHaveBeenCalledWith('sys_normal_disable');
    expect(loadDict).toHaveBeenCalledWith('sys_show_hide');
    expect(loadDict).toHaveBeenCalledWith('sys_yes_no');
  });

  it('搜索条件传递给查询', () => {
    const page = create();
    page.searchForm.patchValue({ menuName: '用户', status: '1' });
    page.getList();

    expect(listMenu).toHaveBeenLastCalledWith({ menuName: '用户', status: '1' });
  });

  it('toggleRow 折叠菜单', () => {
    const page = create();

    expect(page.flatRows()).toHaveLength(3);
    page.toggleRow(page.flatRows()[0] as never);
    expect(page.flatRows()).toHaveLength(1);
  });

  it('openAdd 拉取父级选项，主类目为根', () => {
    const page = create();

    page.openAdd(2);

    expect(treeselect).toHaveBeenCalledTimes(1);
    expect(page.form.controls.parentId.value).toBe(2);
    expect(page.parentOptions()[0]).toMatchObject({ title: '主类目', key: '0' });
  });

  it('openEdit 回填并加载父级选项', () => {
    const page = create();

    page.openEdit(flatMenus[1]);

    expect(treeselect).toHaveBeenCalledTimes(1);
    expect(page.form.controls.menuId.value).toBe(2);
    expect(page.form.controls.menuName.value).toBe('用户管理');
    expect(page.dialogTitle()).toBe('修改菜单');
  });

  it('新增提交后调 addMenu 并刷新', () => {
    const page = create();
    listMenu.mockClear();

    page.openAdd();
    page.form.patchValue({ menuName: '新菜单', orderNum: 1 });
    page.submitForm();

    expect(addMenu).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledWith('新增成功');
    expect(listMenu).toHaveBeenCalledTimes(1);
  });

  it('表单无效时不提交', () => {
    const page = create();

    page.openAdd();
    page.submitForm();

    expect(addMenu).not.toHaveBeenCalled();
    expect(page.dialogVisible()).toBe(true);
  });

  it('删除：确认后逐条调用 delMenu', () => {
    const page = create();
    listMenu.mockClear();

    page.delete(flatMenus[0]);
    page.delete(flatMenus[1]);

    expect(delMenu).toHaveBeenCalledWith(1);
    expect(delMenu).toHaveBeenCalledWith(2);
    expect(success).toHaveBeenCalledWith('删除成功');
  });
});
