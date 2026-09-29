import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SysMenuApi } from '@api/system/menu';
import { DictTypeApi } from '@api/system/dict/type';
import { GenApi } from '@api/tool/gen';
import { SysMenu } from '@core/models/system';
import { GenTable, GenTableColumn } from '@core/models/tool';
import { GenEditPage } from './gen-edit';

type Mock = ReturnType<typeof vi.fn>;

describe('GenEditPage 生成配置编辑', () => {
  let api: { getGenTable: Mock; updateGenTable: Mock };
  let listMenu: Mock;
  let optionselect: Mock;
  let navigate: Mock;
  let success: Mock;
  let error: Mock;
  let paramMap: Record<string, string>;
  let queryMap: Record<string, string>;

  const columns: GenTableColumn[] = [
    { columnId: 1, columnName: 'user_id', columnComment: '用户ID', javaType: 'Long' },
    { columnId: 2, columnName: 'user_name', columnComment: '用户名', javaType: 'String' },
  ];
  const info: GenTable = {
    tableId: 1,
    tableName: 'sys_user',
    tableComment: '用户表',
    className: 'SysUser',
    functionAuthor: 'ruoyi',
    tplCategory: 'crud',
    packageName: 'com.ruoyi.system',
    moduleName: 'system',
    businessName: 'user',
    functionName: '用户',
    parentMenuId: 100,
    view: true,
    formColNum: 1,
  };
  const menus: SysMenu[] = [
    { menuId: 1, parentId: 0, menuName: '系统管理' },
    { menuId: 100, parentId: 1, menuName: '用户管理' },
  ];

  beforeEach(() => {
    api = {
      getGenTable: vi.fn(() =>
        of({ code: 200, msg: '', data: { info, rows: columns, tables: [] } }),
      ),
      updateGenTable: vi.fn(() => of({ code: 200, msg: '修改成功' })),
    };
    listMenu = vi.fn(() => of({ code: 200, msg: '', data: menus }));
    optionselect = vi.fn(() => of({ code: 200, msg: '', data: [{ dictId: 1, dictName: '状态' }] }));
    navigate = vi.fn(() => Promise.resolve(true));
    success = vi.fn();
    error = vi.fn();
    paramMap = { tableId: '1' };
    queryMap = { pageNum: '2' };
    TestBed.configureTestingModule({
      providers: [
        { provide: GenApi, useValue: api },
        { provide: SysMenuApi, useValue: { listMenu } },
        { provide: DictTypeApi, useValue: { optionselect } },
        { provide: NzMessageService, useValue: { success, error, warning: vi.fn() } },
        { provide: Router, useValue: { navigate } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get paramMap() {
                return convertToParamMap(paramMap);
              },
              get queryParamMap() {
                return convertToParamMap(queryMap);
              },
            },
          },
        },
      ],
    });
  });

  async function create(): Promise<GenEditPage> {
    const fixture = TestBed.createComponent(GenEditPage);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  it('ngOnInit 加载字典/菜单/表详情并回填表单', async () => {
    const page = await create();

    expect(api.getGenTable).toHaveBeenCalledWith('1');
    expect(listMenu).toHaveBeenCalledTimes(1);
    expect(optionselect).toHaveBeenCalledTimes(1);
    expect(page.basicForm.controls.tableName.value).toBe('sys_user');
    expect(page.genForm.controls.parentMenuId.value).toBe('100');
    expect(page.columns()).toHaveLength(2);
    expect(page.menuOptions()[0].key).toBe('1');
    expect(page.loading()).toBe(false);
  });

  it('缺少 tableId 时不发请求', async () => {
    paramMap = {};
    const page = await create();

    expect(api.getGenTable).not.toHaveBeenCalled();
    expect(page.loading()).toBe(false);
  });

  it('setFlag 更新字段开关位', async () => {
    const page = await create();

    page.setFlag(0, 'isList', true);
    expect(page.isFlagOn(page.columns()[0], 'isList')).toBe(true);

    page.setFlag(0, 'isList', false);
    expect(page.isFlagOn(page.columns()[0], 'isList')).toBe(false);
  });

  it('columnLabel 拼接列名与注释', async () => {
    const page = await create();

    expect(page.columnLabel(page.columns()[1])).toBe('user_name：用户名');
  });

  it('resetGenPath 重置生成路径', async () => {
    const page = await create();

    page.resetGenPath();

    expect(page.genForm.controls.genPath.value).toBe('/');
  });

  it('提交时带上字段排序与扩展参数', async () => {
    const page = await create();

    page.submit();

    expect(api.updateGenTable).toHaveBeenCalledWith(
      expect.objectContaining({
        tableId: 1,
        tableName: 'sys_user',
        columns: [expect.objectContaining({ sort: 1 }), expect.objectContaining({ sort: 2 })],
        params: expect.objectContaining({ genView: '1', parentMenuId: 100 }),
      }),
    );
    expect(success).toHaveBeenCalledWith('修改成功');
    expect(navigate).toHaveBeenCalledWith(
      ['/tool/gen'],
      expect.objectContaining({ queryParams: expect.objectContaining({ pageNum: '2' }) }),
    );
  });

  it('表单校验未通过时不提交', async () => {
    const page = await create();
    page.basicForm.patchValue({ className: '' });

    page.submit();

    expect(error).toHaveBeenCalledWith('表单校验未通过，请重新检查提交内容');
    expect(api.updateGenTable).not.toHaveBeenCalled();
  });

  it('close 返回列表页并带回页码', async () => {
    const page = await create();

    page.close();

    expect(navigate).toHaveBeenCalledWith(
      ['/tool/gen'],
      expect.objectContaining({ queryParams: expect.objectContaining({ pageNum: '2' }) }),
    );
  });
});
