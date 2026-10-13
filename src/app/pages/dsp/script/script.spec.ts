import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DspScriptApi } from '@api/dsp/script';
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
  let success: Mock;

  const scripts: DspScript[] = [
    {
      scriptId: 1,
      slug: 'order_query',
      name: '订单查询',
      description: 'demo',
      content: '<select id="selectAll" resultType="map">select 1</select>',
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
        data: [{ versionId: 10, scriptId: 1, version: 2, status: '1', publishBy: 'admin' }],
      }),
    );
    getVersion = vi.fn(() =>
      of({
        code: 200,
        msg: '',
        data: {
          versionId: 10,
          version: 2,
          content: '<select id="selectAll" resultType="map">select 1</select>',
        },
      }),
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
    stubModalService(fixture.debugElement);
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

  it('新增时生成仅含语句片段的默认内容，不写 mapper 包装与 namespace', () => {
    const page = create();

    page.openAdd();
    expect(page.isEdit()).toBe(false);
    expect(page.editorXml()).toContain('<select id="selectList"');
    expect(page.editorXml()).not.toContain('<mapper');
    expect(page.editorXml()).not.toContain('namespace=');

    page.editorForm.controls.slug.setValue('order_query');
    expect(page.editorXml()).not.toContain('namespace=');
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
    expect(page.editorXml()).toContain('selectAll');

    page.submitEditor();
    expect(updateScript).toHaveBeenCalledWith(
      expect.objectContaining({ scriptId: 1, slug: 'order_query' }),
    );
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

    page.rollbackVersion(page.versions()[0]);
    expect(rollback).toHaveBeenCalledWith(1, 10);
  });
});
