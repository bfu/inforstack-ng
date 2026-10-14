import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DspScriptApi } from '@api/dsp/script';
import { DspDataSourceApi } from '@api/dsp/datasource';
import { MonacoLoader } from '@core/monaco/monaco-loader';
import { DspScript } from '@core/models/dsp';
import { stubModalService } from '@testing/modal-mock';
import { DspScriptPage } from './script';

type Mock = ReturnType<typeof vi.fn>;

describe('DspScriptPage 动态脚本管理', () => {
  let listScript: Mock;
  let getScript: Mock;
  let addScript: Mock;
  let updateScript: Mock;
  let delScript: Mock;
  let validate: Mock;
  let test: Mock;
  let publish: Mock;
  let rollback: Mock;
  let offline: Mock;
  let reload: Mock;
  let listVersions: Mock;
  let getVersion: Mock;
  let listOptions: Mock;
  let success: Mock;
  let modal: ReturnType<typeof stubModalService> | undefined;

  const scripts: DspScript[] = [
    {
      scriptId: 1,
      slug: 'order_query',
      name: '订单查询',
      description: 'demo',
      content: '<select resultType="map">select 1</select>',
      currentVersion: 2,
      status: '1',
    },
  ];

  beforeEach(() => {
    listScript = vi.fn(() => of({ code: 200, msg: '', rows: scripts, total: 1 }));
    getScript = vi.fn(() => of({ code: 200, msg: '', data: scripts[0] }));
    addScript = vi.fn(() => of({ code: 200, msg: '' }));
    updateScript = vi.fn(() => of({ code: 200, msg: '' }));
    delScript = vi.fn(() => of({ code: 200, msg: '' }));
    validate = vi.fn(() =>
      of({
        code: 200,
        msg: '',
        data: { valid: true, statements: ['selectAll', 'insertUser'], errors: [], warnings: [] },
      }),
    );
    test = vi.fn(() =>
      of({
        code: 200,
        msg: '',
        data: { sqlCommandType: 'SELECT', rows: [{ id: 1 }], costMillis: 3, rollback: true },
      }),
    );
    publish = vi.fn(() => of({ code: 200, msg: '', data: 3 }));
    rollback = vi.fn(() => of({ code: 200, msg: '', data: 1 }));
    offline = vi.fn(() => of({ code: 200, msg: '' }));
    reload = vi.fn(() => of({ code: 200, msg: '' }));
    listVersions = vi.fn(() =>
      of({
        code: 200,
        msg: '',
        data: [
          {
            versionId: 10,
            scriptId: 1,
            version: 2,
            status: '1',
            publishBy: 'admin',
            dataSourceId: 5,
          },
        ],
      }),
    );
    getVersion = vi.fn(() =>
      of({
        code: 200,
        msg: '',
        data: { versionId: 10, version: 2, content: '<select resultType="map">select 1</select>' },
      }),
    );
    listOptions = vi.fn(() =>
      of({ code: 200, msg: '', data: [{ dataSourceId: 5, name: '报表库', status: '0' }] }),
    );
    success = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: DspScriptApi,
          useValue: {
            listScript,
            getScript,
            addScript,
            updateScript,
            delScript,
            validate,
            test,
            publish,
            rollback,
            offline,
            reload,
            listVersions,
            getVersion,
            exec: vi.fn(),
          },
        },
        { provide: DspDataSourceApi, useValue: { listOptions } },
        { provide: MonacoLoader, useValue: { load: vi.fn(() => new Promise(() => undefined)) } },
        { provide: NzModalService, useValue: {} },
        {
          provide: NzMessageService,
          useValue: { success, error: vi.fn(), warning: vi.fn() },
        },
      ],
    });
  });

  function create(): DspScriptPage {
    const fixture = TestBed.createComponent(DspScriptPage);
    modal = stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 发起首查', () => {
    const page = create();

    expect(listScript).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      name: undefined,
      slug: undefined,
      status: undefined,
    });
    expect(page.rows()).toEqual(scripts);
    expect(page.total()).toBe(1);
  });

  it('statusMeta 正确映射状态', () => {
    const page = create();

    expect(page.statusMeta('1').label).toBe('已发布');
    expect(page.statusMeta('2').label).toBe('已下线');
    expect(page.statusMeta('0').label).toBe('草稿');
    expect(page.statusMeta(undefined).label).toBe('草稿');
  });

  it('数据源下拉包含默认主库与已登记数据源', () => {
    const page = create();

    expect(page.dataSourceOptions()).toEqual([
      { value: 0, label: '默认主库' },
      { value: 5, label: '报表库' },
    ]);
    expect(page.dataSourceLabel(0)).toBe('默认主库');
    expect(page.dataSourceLabel(undefined)).toBe('默认主库');
    expect(page.dataSourceLabel(5)).toBe('报表库');
    expect(page.dataSourceLabel(9)).toBe('#9');
  });

  it('打开新增/编辑弹窗时刷新数据源下拉', () => {
    const page = create();
    // ngOnInit 首查一次
    expect(listOptions).toHaveBeenCalledTimes(1);

    page.openAdd();
    expect(listOptions).toHaveBeenCalledTimes(2);

    page.openEdit(scripts[0]);
    expect(listOptions).toHaveBeenCalledTimes(3);
  });

  it('脚本保存携带绑定的 dataSourceId', () => {
    const page = create();

    page.openAdd();
    page.editorForm.patchValue({ name: '订单查询', slug: 'order_query', dataSourceId: 5 });
    page.submitEditor();

    expect(addScript).toHaveBeenCalledWith(expect.objectContaining({ dataSourceId: 5 }));
  });

  it('新增时生成单条语句片段，不写 id 与 mapper 包装', () => {
    const page = create();

    page.openAdd();
    expect(page.isEdit).toBe(false);
    expect(page.editorXml()).toContain('<select resultType="map">');
    expect(page.editorXml()).not.toContain('id="');
    expect(page.editorXml()).not.toContain('<mapper');
    expect(page.editorXml()).not.toContain('namespace=');

    page.editorForm.controls.slug.setValue('order_query');
    expect(page.editorXml()).not.toContain('id="');
  });

  it('新增提交调用 addScript', () => {
    const page = create();
    listScript.mockClear();

    page.openAdd();
    page.editorForm.patchValue({ name: '订单查询', slug: 'order_query', description: 'demo' });
    page.submitEditor();

    expect(addScript).toHaveBeenCalledTimes(1);
    expect(addScript).toHaveBeenCalledWith(
      expect.objectContaining({ name: '订单查询', slug: 'order_query' }),
    );
    expect(success).toHaveBeenCalledWith('新增成功');
    expect(listScript).toHaveBeenCalledTimes(1);
  });

  it('编辑回填库中内容并调用 updateScript', () => {
    const page = create();

    page.openEdit(scripts[0]);
    expect(getScript).toHaveBeenCalledWith(1);
    expect(page.editorForm.controls.slug.value).toBe('order_query');
    expect(page.editorXml()).toContain('select 1');

    page.submitEditor();
    expect(updateScript).toHaveBeenCalledWith(
      expect.objectContaining({ scriptId: 1, slug: 'order_query' }),
    );
  });

  it('同一会话内先新增后编辑，分别调用 addScript / updateScript', () => {
    const page = create();

    page.openAdd();
    page.editorForm.patchValue({ name: '新脚本', slug: 'new_script' });
    page.submitEditor();
    expect(addScript).toHaveBeenCalledTimes(1);

    page.openEdit(scripts[0]);
    expect(page.isEdit).toBe(true);
    page.submitEditor();

    expect(updateScript).toHaveBeenCalledTimes(1);
    expect(addScript).toHaveBeenCalledTimes(1);
  });

  it('同一会话内先编辑后新增，新增仍走 addScript', () => {
    const page = create();

    page.openEdit(scripts[0]);
    page.submitEditor();
    expect(updateScript).toHaveBeenCalledTimes(1);

    page.openAdd();
    expect(page.isEdit).toBe(false);
    page.editorForm.patchValue({ name: '另一个脚本', slug: 'other_query' });
    page.submitEditor();

    expect(addScript).toHaveBeenCalledTimes(1);
    expect(updateScript).toHaveBeenCalledTimes(1);
  });

  it('编辑态禁用脚本标识，新增态恢复可编辑', () => {
    const page = create();

    page.openEdit(scripts[0]);
    expect(page.editorForm.controls.slug.disabled).toBe(true);

    page.openAdd();
    expect(page.editorForm.controls.slug.enabled).toBe(true);
  });

  it('删除走确认框并调用 delScript', () => {
    const page = create();
    listScript.mockClear();

    page.deleteScript(scripts[0]);

    expect(delScript).toHaveBeenCalledWith([1]);
    expect(success).toHaveBeenCalledWith('删除成功');
  });

  it('发布调用 publish 并提示版本号', () => {
    const page = create();

    page.publishScript(scripts[0]);

    expect(publish).toHaveBeenCalledWith(1);
    expect(success).toHaveBeenCalledWith('发布成功，当前版本 v3');
  });

  it('打开测试抽屉加载语句并按 JSON 参数执行', () => {
    const page = create();

    page.openTest(scripts[0]);
    expect(validate).toHaveBeenCalledWith(1);
    expect(page.testStatements()).toEqual(['selectAll', 'insertUser']);
    expect(page.testStatement()).toBe('selectAll');

    page.testParams.set('{"id": 1}');
    page.runTest();

    expect(test).toHaveBeenCalledWith(1, 'selectAll', { id: 1 });
    expect(page.testResult()?.sqlCommandType).toBe('SELECT');
    expect(page.testColumns()).toEqual(['id']);
  });

  it('参数 JSON 非法时不发起执行', () => {
    const page = create();
    page.openTest(scripts[0]);
    page.testParams.set('{ bad json }');
    page.runTest();

    expect(test).not.toHaveBeenCalled();
  });

  it('打开版本抽屉加载版本列表，并可回滚', () => {
    const page = create();

    page.openVersions(scripts[0]);
    expect(listVersions).toHaveBeenCalledWith(1);
    expect(page.versions().length).toBe(1);
    // 版本快照携带发布时绑定的数据源
    expect(page.versions()[0].dataSourceId).toBe(5);

    page.rollbackVersion(page.versions()[0]);
    expect(rollback).toHaveBeenCalledWith(1, 10);
    // 回滚提示需说明数据源将随版本一并切换
    expect(modal?.lastConfig()?.nzContent).toContain('数据源将由「默认主库」切换为「报表库」');
  });

  it('回滚到同数据源的版本时不提示切换', () => {
    const page = create();

    page.openVersions(scripts[0]);
    page.rollbackVersion({ ...page.versions()[0], dataSourceId: undefined });

    expect(rollback).toHaveBeenCalledWith(1, 10);
    expect(modal?.lastConfig()?.nzContent).toContain('内容与数据源');
    expect(modal?.lastConfig()?.nzContent).not.toContain('数据源将由');
  });
});
