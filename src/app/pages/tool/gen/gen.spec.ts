import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { GenApi } from '@api/tool/gen';
import { DownloadService } from '@core/download.service';
import { GenTable } from '@core/models/tool';
import { UserStore } from '@store/user.store';
import { stubModalService } from '@testing/modal-mock';
import { GenPage } from './gen';

type Mock = ReturnType<typeof vi.fn>;

describe('GenPage 代码生成', () => {
  let api: {
    listTable: Mock;
    listDbTable: Mock;
    importTable: Mock;
    createTable: Mock;
    delTable: Mock;
    previewTable: Mock;
    genCode: Mock;
    synchDb: Mock;
  };
  let zip: Mock;
  let navigate: Mock;
  let success: Mock;
  let error: Mock;

  const tables: GenTable[] = [
    { tableId: 1, tableName: 'sys_user', tableComment: '用户表' },
    { tableId: 2, tableName: 'sys_role', tableComment: '角色表' },
  ];

  beforeEach(() => {
    api = {
      listTable: vi.fn(() => of({ code: 200, msg: '', rows: tables, total: tables.length })),
      listDbTable: vi.fn(() => of({ code: 200, msg: '', rows: tables, total: tables.length })),
      importTable: vi.fn(() => of({ code: 200, msg: '导入成功' })),
      createTable: vi.fn(() => of({ code: 200, msg: '创建成功' })),
      delTable: vi.fn(() => of({ code: 200, msg: '' })),
      previewTable: vi.fn(() =>
        of({
          code: 200,
          msg: '',
          data: {
            'java/com/ruoyi/domain/User.java.vm': 'class User {}',
            'vm/angular/user.html.vm': '<div></div>',
          },
        }),
      ),
      genCode: vi.fn(() => of({ code: 200, msg: '' })),
      synchDb: vi.fn(() => of({ code: 200, msg: '' })),
    };
    zip = vi.fn();
    navigate = vi.fn(() => Promise.resolve(true));
    success = vi.fn();
    error = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: GenApi, useValue: api },
        { provide: DownloadService, useValue: { zip } },
        { provide: NzModalService, useValue: {} },
        { provide: NzMessageService, useValue: { success, error, warning: vi.fn() } },
        { provide: Router, useValue: { navigate } },
        {
          provide: UserStore,
          useValue: { hasPermi: vi.fn(() => true), hasRole: vi.fn(() => true) },
        },
      ],
    });
  });

  function create(): GenPage {
    const fixture = TestBed.createComponent(GenPage);
    stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 首查按创建时间倒序', () => {
    const page = create();

    expect(api.listTable).toHaveBeenCalledWith(
      expect.objectContaining({
        pageNum: 1,
        pageSize: 10,
        orderByColumn: 'createTime',
        isAsc: 'descending',
        tableName: undefined,
        tableComment: undefined,
      }),
    );
    expect(page.rows()).toEqual(tables);
  });

  it('分页与排序参数更新查询', () => {
    const page = create();

    page.onQueryParams({
      pageIndex: 2,
      pageSize: 20,
      sort: [{ key: 'tableName', value: 'ascend' }],
    } as never);

    expect(api.listTable).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageNum: 2,
        pageSize: 20,
        orderByColumn: 'tableName',
        isAsc: 'ascending',
      }),
    );
  });

  it('resetQuery 重置条件与日期', () => {
    const page = create();
    page.searchForm.patchValue({ tableName: 'sys_user' });
    page.dateRange.set([new Date(), new Date()]);

    page.resetQuery();

    expect(page.searchForm.getRawValue()).toEqual({ tableName: '', tableComment: '' });
    expect(page.dateRange()).toEqual([]);
    expect(page.pageNum()).toBe(1);
  });

  it('编辑跳转生成配置页并带回页码', () => {
    const page = create();
    page.pageNum.set(3);

    page.handleEditTable(tables[0]);

    expect(navigate).toHaveBeenCalledWith(['/tool/gen-edit/index', 1], {
      queryParams: { pageNum: 3 },
    });
  });

  it('未选择数据时编辑不跳转', () => {
    const page = create();

    page.handleEditTable();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('生成代码（zip 打包下载）', () => {
    const page = create();
    page.selection.onItemChecked(1, true);

    page.handleGenTable();

    expect(zip).toHaveBeenCalledWith('/tool/gen/batchGenCode?tables=sys_user', 'ruoyi.zip');
  });

  it('生成代码到自定义路径', () => {
    const page = create();

    page.handleGenTable({ tableId: 3, tableName: 'sys_log', genType: '1', genPath: '/tmp/gen' });

    expect(api.genCode).toHaveBeenCalledWith('sys_log');
    expect(success).toHaveBeenCalledWith('成功生成到自定义路径：/tmp/gen');
    expect(zip).not.toHaveBeenCalled();
  });

  it('未选择数据时生成给出错误提示', () => {
    const page = create();

    page.handleGenTable();

    expect(error).toHaveBeenCalledWith('请选择要生成的数据');
    expect(zip).not.toHaveBeenCalled();
  });

  it('同步数据库：确认后调 synchDb', () => {
    const page = create();

    page.handleSynchDb(tables[0]);

    expect(api.synchDb).toHaveBeenCalledWith('sys_user');
    expect(success).toHaveBeenCalledWith('同步成功');
  });

  it('删除：确认后调 delTable 并刷新', () => {
    const page = create();
    api.listTable.mockClear();

    page.handleDelete(tables[1]);

    expect(api.delTable).toHaveBeenCalledWith([2]);
    expect(success).toHaveBeenCalledWith('删除成功');
    expect(api.listTable).toHaveBeenCalledTimes(1);
  });

  describe('导入表弹窗', () => {
    it('打开时加载未导入表', () => {
      const page = create();

      page.openImportTable();

      expect(api.listDbTable).toHaveBeenCalledWith({
        pageNum: 1,
        pageSize: 10,
        tableName: undefined,
        tableComment: undefined,
      });
      expect(page.importVisible()).toBe(true);
      expect(page.importRows()).toEqual(tables);
    });

    it('未勾选表时提交给出提示', () => {
      const page = create();

      page.openImportTable();
      page.submitImport();

      expect(error).toHaveBeenCalledWith('请选择要导入的表');
      expect(api.importTable).not.toHaveBeenCalled();
    });

    it('勾选后提交导入并刷新列表', () => {
      const page = create();
      api.listTable.mockClear();

      page.openImportTable();
      page.importSelection.onItemChecked('sys_user', true);
      page.submitImport();

      expect(api.importTable).toHaveBeenCalledWith({ tables: 'sys_user', tplWebType: 'angular' });
      expect(page.importVisible()).toBe(false);
      expect(api.listTable).toHaveBeenCalledTimes(1);
    });
  });

  describe('创建表弹窗', () => {
    it('空语句给出提示', () => {
      const page = create();

      page.openCreateTable();
      page.submitCreate();

      expect(error).toHaveBeenCalledWith('请输入建表语句');
      expect(api.createTable).not.toHaveBeenCalled();
    });

    it('提交建表语句后刷新列表', () => {
      const page = create();
      api.listTable.mockClear();

      page.openCreateTable();
      page.createContent.set('create table t (id int)');
      page.submitCreate();

      expect(api.createTable).toHaveBeenCalledWith({
        sql: 'create table t (id int)',
        tplWebType: 'angular',
      });
      expect(page.createVisible()).toBe(false);
      expect(api.listTable).toHaveBeenCalledTimes(1);
    });
  });

  describe('代码预览', () => {
    it('按模板路径生成文件列表并定位 domain.java', () => {
      const page = create();

      page.handlePreview(tables[0]);

      expect(api.previewTable).toHaveBeenCalledWith(1);
      expect(page.previewFiles().map((file) => file.name)).toEqual(['User.java', 'user.html']);
      expect(page.previewLoading()).toBe(false);
      expect(page.previewVisible()).toBe(true);
    });

    it('无 tableId 时不预览', () => {
      const page = create();

      page.handlePreview({});

      expect(api.previewTable).not.toHaveBeenCalled();
    });
  });
});
