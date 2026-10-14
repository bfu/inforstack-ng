import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DspDataSourceApi } from '@api/dsp/datasource';
import { DspDataSource } from '@core/models/dsp';
import { stubModalService } from '@testing/modal-mock';
import { DspDataSourcePage } from './datasource';

type Mock = ReturnType<typeof vi.fn>;

describe('DspDataSourcePage 数据源管理', () => {
  let listDataSource: Mock;
  let getDataSource: Mock;
  let addDataSource: Mock;
  let updateDataSource: Mock;
  let delDataSource: Mock;
  let testConnection: Mock;
  let success: Mock;

  const sources: DspDataSource[] = [
    {
      dataSourceId: 5,
      name: '报表库',
      dbType: 'mysql',
      driverClassName: 'com.mysql.cj.jdbc.Driver',
      url: 'jdbc:mysql://127.0.0.1:3306/report',
      username: 'report',
      status: '0',
    },
  ];

  beforeEach(() => {
    listDataSource = vi.fn(() => of({ code: 200, msg: '', rows: sources, total: 1 }));
    getDataSource = vi.fn(() => of({ code: 200, msg: '', data: sources[0] }));
    addDataSource = vi.fn(() => of({ code: 200, msg: '' }));
    updateDataSource = vi.fn(() => of({ code: 200, msg: '' }));
    delDataSource = vi.fn(() => of({ code: 200, msg: '' }));
    testConnection = vi.fn(() =>
      of({ code: 200, msg: '', data: { success: true, message: 'MySQL 8.0', costMillis: 12 } }),
    );
    success = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: DspDataSourceApi,
          useValue: {
            listDataSource,
            listOptions: vi.fn(() => of({ code: 200, msg: '', data: sources })),
            getDataSource,
            addDataSource,
            updateDataSource,
            delDataSource,
            testConnection,
          },
        },
        { provide: NzModalService, useValue: {} },
        {
          provide: NzMessageService,
          useValue: { success, error: vi.fn(), warning: vi.fn() },
        },
      ],
    });
  });

  function create(): DspDataSourcePage {
    const fixture = TestBed.createComponent(DspDataSourcePage);
    stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 发起首查', () => {
    const page = create();

    expect(listDataSource).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      name: undefined,
      status: undefined,
    });
    expect(page.rows()).toEqual(sources);
    expect(page.total()).toBe(1);
  });

  it('statusMeta 正确映射状态', () => {
    const page = create();

    expect(page.statusMeta('0').label).toBe('正常');
    expect(page.statusMeta('1').label).toBe('停用');
    expect(page.statusMeta(undefined).label).toBe('正常');
  });

  it('新增提交调用 addDataSource', () => {
    const page = create();
    listDataSource.mockClear();

    page.openAdd();
    expect(page.isEdit).toBe(false);
    page.editorForm.patchValue({
      name: '报表库',
      driverClassName: 'com.mysql.cj.jdbc.Driver',
      url: 'jdbc:mysql://127.0.0.1:3306/report',
      username: 'report',
      password: 'secret',
    });
    page.submitEditor();

    expect(addDataSource).toHaveBeenCalledTimes(1);
    expect(addDataSource).toHaveBeenCalledWith(
      expect.objectContaining({ name: '报表库', driverClassName: 'com.mysql.cj.jdbc.Driver' }),
    );
    expect(success).toHaveBeenCalledWith('新增成功');
    expect(listDataSource).toHaveBeenCalledTimes(1);
  });

  it('编辑回填详情并调用 updateDataSource', () => {
    const page = create();

    page.openEdit(sources[0]);
    expect(getDataSource).toHaveBeenCalledWith(5);
    expect(page.editorForm.controls.url.value).toBe('jdbc:mysql://127.0.0.1:3306/report');

    page.submitEditor();
    expect(updateDataSource).toHaveBeenCalledWith(expect.objectContaining({ dataSourceId: 5 }));
  });

  it('同一会话内先新增后编辑，分别调用 addDataSource / updateDataSource', () => {
    const page = create();

    page.openAdd();
    page.editorForm.patchValue({
      name: '报表库',
      driverClassName: 'com.mysql.cj.jdbc.Driver',
      url: 'jdbc:mysql://127.0.0.1:3306/report',
      username: 'report',
      password: 'secret',
    });
    page.submitEditor();
    expect(addDataSource).toHaveBeenCalledTimes(1);

    page.openEdit(sources[0]);
    expect(page.isEdit).toBe(true);
    page.submitEditor();

    expect(updateDataSource).toHaveBeenCalledTimes(1);
    expect(addDataSource).toHaveBeenCalledTimes(1);
  });

  it('编辑时不回填数据库口令（接口不回传，留空表示沿用）', () => {
    getDataSource.mockReturnValue(
      of({ code: 200, msg: '', data: { ...sources[0], password: 'secret' } }),
    );
    const page = create();

    page.openEdit(sources[0]);

    expect(page.editorForm.controls.password.value).toBe('');
  });

  it('编辑时口令留空不提交 password 字段', () => {
    const page = create();

    page.openEdit(sources[0]);
    page.submitEditor();

    expect(updateDataSource).toHaveBeenCalledTimes(1);
    const payload = updateDataSource.mock.calls[0][0] as DspDataSource;
    expect(payload.password).toBeUndefined();
    expect(payload.username).toBe('report');
  });

  it('新增时填写口令会带上 password 字段', () => {
    const page = create();

    page.openAdd();
    page.editorForm.patchValue({
      name: '报表库',
      driverClassName: 'com.mysql.cj.jdbc.Driver',
      url: 'jdbc:mysql://127.0.0.1:3306/report',
      username: 'report',
      password: 'secret',
    });
    page.submitEditor();

    expect(addDataSource).toHaveBeenCalledTimes(1);
    const payload = addDataSource.mock.calls[0][0] as DspDataSource;
    expect(payload.password).toBe('secret');
  });

  it('列表行测试连接按ID发起', () => {
    const page = create();

    page.testRow(sources[0]);

    expect(testConnection).toHaveBeenCalledWith({ dataSourceId: 5, name: '报表库' });
    expect(page.testResult()?.success).toBe(true);
    expect(success).toHaveBeenCalledWith('连接成功');
  });

  it('弹窗测试连接校验必填项', () => {
    const page = create();

    page.openAdd();
    page.testEditor();
    expect(testConnection).not.toHaveBeenCalled();

    page.editorForm.patchValue({
      driverClassName: 'com.mysql.cj.jdbc.Driver',
      url: 'jdbc:mysql://127.0.0.1:3306/report',
    });
    page.testEditor();
    expect(testConnection).toHaveBeenCalledTimes(1);
  });

  it('删除走确认框并调用 delDataSource', () => {
    const page = create();

    page.deleteDataSource(sources[0]);

    expect(delDataSource).toHaveBeenCalledWith([5]);
    expect(success).toHaveBeenCalledWith('删除成功');
  });
});
