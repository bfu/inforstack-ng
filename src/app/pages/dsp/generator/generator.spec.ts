import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DspGeneratorApi } from '@api/dsp/generator';
import { DspColumnInfo, DspGeneratedScript, DspTableInfo } from '@core/models/dsp';
import { stubModalService } from '@testing/modal-mock';
import { DspGeneratorPage } from './generator';

type Mock = ReturnType<typeof vi.fn>;

describe('DspGeneratorPage 脚本生成', () => {
  let listDataSources: Mock;
  let listInstances: Mock;
  let listTables: Mock;
  let listColumns: Mock;
  let preview: Mock;
  let generate: Mock;
  let success: Mock;
  let warning: Mock;

  const tables: DspTableInfo[] = [
    { tableName: 'sys_user', tableComment: '用户信息', tableType: 'TABLE' },
  ];

  const columns: DspColumnInfo[] = [
    {
      columnName: 'user_id',
      columnComment: '用户ID',
      columnType: 'bigint(20)',
      javaType: 'Long',
      javaField: 'userId',
      primaryKey: true,
      autoIncrement: true,
      ordinal: 1,
    },
    {
      columnName: 'user_name',
      columnComment: '用户账号',
      columnType: 'varchar(30)',
      javaType: 'String',
      javaField: 'userName',
      required: true,
      ordinal: 2,
    },
  ];

  /** 6 条脚本：查询拆 2 条、新增拆 2 条，另含修改与删除（命名与后端生成器一致） */
  const scripts: DspGeneratedScript[] = [
    ['selectAll', '查询所有', 'SELECT', 'SelectAll'],
    ['selectPage', '翻页查询', 'SELECT', 'SelectPage'],
    ['insertBatch', '批量添加', 'INSERT', 'InsertBatch'],
    ['insertOne', '单条添加', 'INSERT', 'InsertOne'],
    ['update', '修改', 'UPDATE', 'Update'],
    ['delete', '删除', 'DELETE', 'Delete'],
  ].map(([action, actionName, sqlCommandType, suffix]) => ({
    action,
    actionName,
    sqlCommandType,
    name: `用户信息${actionName}`,
    slug: `sysUser${suffix}`,
    description: '脚本生成器自动生成',
    content: `<${sqlCommandType.toLowerCase()}></${sqlCommandType.toLowerCase()}>`,
  }));

  beforeEach(() => {
    listDataSources = vi.fn(() =>
      of({ code: 200, msg: '', data: [{ dataSourceId: 5, name: '报表库' }] }),
    );
    listInstances = vi.fn(() =>
      of({
        code: 200,
        msg: '',
        data: [{ name: 'report', catalog: 'report', type: 'catalog', current: true }],
      }),
    );
    listTables = vi.fn(() => of({ code: 200, msg: '', data: tables }));
    listColumns = vi.fn(() => of({ code: 200, msg: '', data: columns }));
    preview = vi.fn(() =>
      of({
        code: 200,
        msg: '',
        data: {
          tableName: 'sys_user',
          tableComment: '用户信息',
          databaseProduct: 'mysql',
          columns,
          scripts,
        },
      }),
    );
    generate = vi.fn(() => of({ code: 200, msg: '', data: scripts }));
    success = vi.fn();
    warning = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: DspGeneratorApi,
          useValue: { listDataSources, listInstances, listTables, listColumns, preview, generate },
        },
        { provide: NzModalService, useValue: {} },
        {
          provide: NzMessageService,
          useValue: { success, warning, error: vi.fn() },
        },
      ],
    });
  });

  function create(): DspGeneratorPage {
    const fixture = TestBed.createComponent(DspGeneratorPage);
    stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 加载数据源并探测默认主库实例，单实例自动选中', () => {
    const page = create();

    expect(listDataSources).toHaveBeenCalled();
    expect(listInstances).toHaveBeenCalledWith(0);
    expect(page.instanceKey()).toBe('catalog:report:');
    expect(listTables).toHaveBeenCalledWith({
      dataSourceId: 0,
      catalog: 'report',
      schema: undefined,
      tableName: undefined,
    });
  });

  it('选择数据表后加载表结构并生成 6 条脚本预览', () => {
    const page = create();
    listColumns.mockClear();

    page.onTableChange('sys_user');

    expect(listColumns).toHaveBeenCalledWith({
      dataSourceId: 0,
      catalog: 'report',
      schema: undefined,
      tableName: 'sys_user',
    });
    expect(preview).toHaveBeenCalledWith({
      dataSourceId: 0,
      catalog: 'report',
      schema: undefined,
      tableName: 'sys_user',
    });
    expect(page.scripts()).toHaveLength(6);
    expect(page.scripts().map((item) => item.actionName)).toEqual([
      '查询所有',
      '翻页查询',
      '批量添加',
      '单条添加',
      '修改',
      '删除',
    ]);
    expect(page.columns()).toHaveLength(2);
    expect(page.tableComment()).toBe('用户信息');
  });

  it('切换数据源会清空下级的表与预览并重新探测实例', () => {
    const page = create();
    page.onTableChange('sys_user');

    page.onDataSourceChange(5);

    expect(listInstances).toHaveBeenLastCalledWith(5);
    expect(page.tableName()).toBeUndefined();
    expect(page.tables()).toEqual(tables);
    expect(page.scripts()).toEqual([]);
    expect(page.columns()).toEqual([]);
  });

  it('切换实例会清空已选表并重新加载数据表', () => {
    const page = create();
    page.onTableChange('sys_user');
    listTables.mockClear();

    page.onInstanceChange('catalog:other:');

    expect(page.tableName()).toBeUndefined();
    expect(page.scripts()).toEqual([]);
    expect(listTables).toHaveBeenCalledWith({
      dataSourceId: 0,
      catalog: undefined,
      schema: undefined,
      tableName: undefined,
    });
  });

  it('未探测到实例的数据源直接进入数据表选择', () => {
    listInstances.mockReturnValue(of({ code: 200, msg: '', data: [] }));

    const page = create();

    expect(page.noInstance()).toBe(true);
    expect(page.tableSelectable()).toBe(true);
    expect(listTables).toHaveBeenCalledTimes(1);
  });

  it('生成脚本提交预览结果并清空预览', () => {
    const page = create();
    page.onTableChange('sys_user');

    page.generate();

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        dataSourceId: 0,
        scripts: expect.arrayContaining([expect.objectContaining({ slug: 'sysUserSelectAll' })]),
      }),
    );
    expect(success).toHaveBeenCalled();
    expect(page.scripts()).toEqual([]);
  });

  it('脚本名称或标识为空时拒绝提交', () => {
    const page = create();
    page.onTableChange('sys_user');
    page.scripts()[0].slug = '';

    page.generate();

    expect(warning).toHaveBeenCalledWith('脚本名称与脚本标识不能为空');
    expect(generate).not.toHaveBeenCalled();
  });

  it('查看脚本内容打开内容弹窗', () => {
    const page = create();
    page.onTableChange('sys_user');

    page.viewContent(page.scripts()[0]);

    expect(page.contentVisible()).toBe(true);
    expect(page.contentTitle()).toContain('查询所有');
    expect(page.contentText()).toContain('select');
  });
});
