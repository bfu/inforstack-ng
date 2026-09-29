import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DeptApi } from '@api/system/dept';
import { SysDept } from '@core/models/system';
import { DictStore } from '@store/dict.store';
import { UserStore } from '@store/user.store';
import { stubModalService } from '@testing/modal-mock';
import { DeptPage } from './dept';

type Mock = ReturnType<typeof vi.fn>;

describe('DeptPage 部门管理', () => {
  let listDept: Mock;
  let treeselect: Mock;
  let addDept: Mock;
  let updateDept: Mock;
  let delDept: Mock;
  let success: Mock;
  let getDict: ReturnType<typeof vi.fn>;
  let loadDict: ReturnType<typeof vi.fn>;

  const flatDepts: SysDept[] = [
    { deptId: 100, parentId: 0, deptName: '总公司', orderNum: 0 },
    { deptId: 101, parentId: 100, deptName: '研发部门', orderNum: 1 },
    { deptId: 102, parentId: 100, deptName: '市场部门', orderNum: 2 },
    { deptId: 103, parentId: 0, deptName: '分公司', orderNum: 3 },
  ];

  beforeEach(() => {
    listDept = vi.fn(() => of({ code: 200, msg: '', data: flatDepts }));
    treeselect = vi.fn(() => of({ code: 200, msg: '', data: flatDepts }));
    addDept = vi.fn(() => of({ code: 200, msg: '' }));
    updateDept = vi.fn(() => of({ code: 200, msg: '' }));
    delDept = vi.fn(() => of({ code: 200, msg: '' }));
    success = vi.fn();
    getDict = vi.fn(() => [{ label: '正常', value: '0', listClass: 'primary' }]);
    loadDict = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: DeptApi, useValue: { listDept, treeselect, addDept, updateDept, delDept } },
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

  function create(): DeptPage {
    const fixture = TestBed.createComponent(DeptPage);
    stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 首查并组装部门树', () => {
    const page = create();

    expect(listDept).toHaveBeenCalledWith({ deptName: undefined, status: undefined });
    expect(page.deptTree()).toHaveLength(2);
    const root = page.deptTree()[0];
    expect(root.deptName).toBe('总公司');
    expect(root.children).toHaveLength(2);
  });

  it('根节点默认展开，flatRows 按层级平铺', () => {
    const page = create();

    expect(page.flatRows()).toHaveLength(4);
    expect(page.flatRows().map((row) => row.level)).toEqual([0, 1, 1, 0]);
  });

  it('toggleExpandAll 全部展开与收起', () => {
    const page = create();

    page.toggleExpandAll();
    expect(page.allExpanded()).toBe(true);

    page.toggleExpandAll();
    expect(page.allExpanded()).toBe(false);
    expect(page.flatRows()).toHaveLength(2);
  });

  it('toggleRow 收起父部门后不再平铺其子级', () => {
    const page = create();

    page.toggleRow(page.flatRows()[0] as never);
    expect(page.flatRows()).toHaveLength(2);
    expect(page.flatRows().map((row) => row.deptName)).toEqual(['总公司', '分公司']);
  });

  it('openAdd 重置表单并回填指定 parentId', () => {
    const page = create();

    page.openAdd(101);

    expect(treeselect).toHaveBeenCalledWith(undefined);
    expect(page.form.controls.parentId.value).toBe(101);
    expect(page.dialogTitle()).toBe('添加部门');
    expect(page.dialogVisible()).toBe(true);
  });

  it('openEdit 回填表单并排除自身作为父级选项', () => {
    const page = create();

    page.openEdit(flatDepts[1]);
    expect(treeselect).toHaveBeenCalledWith(101);
    expect(page.form.controls.deptId.value).toBe(101);
    expect(page.form.controls.deptName.value).toBe('研发部门');
    expect(page.dialogTitle()).toBe('修改部门');
  });

  it('新增提交后调 addDept 并刷新', () => {
    const page = create();
    listDept.mockClear();

    page.openAdd();
    page.form.patchValue({ deptName: '新部门', orderNum: 1 });
    page.submitForm();

    expect(addDept).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledWith('新增成功');
    expect(listDept).toHaveBeenCalledTimes(1);
  });

  it('编辑提交后调 updateDept', () => {
    const page = create();

    page.openEdit(flatDepts[1]);
    page.submitForm();

    expect(updateDept).toHaveBeenCalledWith(
      expect.objectContaining({ deptId: 101, deptName: '研发部门' }),
    );
    expect(success).toHaveBeenCalledWith('修改成功');
  });

  it('删除：确认后逐条调用 delDept', () => {
    const page = create();
    listDept.mockClear();

    page.delete(flatDepts[1]);

    expect(delDept).toHaveBeenCalledWith(101);
    expect(success).toHaveBeenCalledWith('删除成功');
    expect(listDept).toHaveBeenCalledTimes(1);
  });

  it('批量删除使用已勾选行', () => {
    const page = create();

    page.selection.onItemChecked(101, true);
    page.selection.onItemChecked(102, true);
    page.delete();

    expect(delDept).toHaveBeenCalledWith(101);
    expect(delDept).toHaveBeenCalledWith(102);
    expect(delDept).toHaveBeenCalledTimes(2);
  });
});
