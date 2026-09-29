import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ConfigApi } from '@api/system/config';
import { DownloadService } from '@core/download.service';
import { SysConfig } from '@core/models/system';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { DictStore } from '@store/dict.store';
import { UserStore } from '@store/user.store';
import { stubModalService } from '@testing/modal-mock';
import { ConfigPage } from './config';

type Mock = ReturnType<typeof vi.fn>;

describe('ConfigPage 参数设置', () => {
  let listConfig: Mock;
  let addConfig: Mock;
  let updateConfig: Mock;
  let delConfig: Mock;
  let refreshCache: Mock;
  let download: Mock;
  let success: Mock;
  let getDict: ReturnType<typeof vi.fn>;
  let loadDict: ReturnType<typeof vi.fn>;

  const configs: SysConfig[] = [
    {
      configId: 1,
      configName: '主框架页',
      configKey: 'sys.index.skinName',
      configValue: 'skin-blue',
      configType: 'Y',
    },
  ];

  beforeEach(() => {
    listConfig = vi.fn(() => of({ code: 200, msg: '', rows: configs, total: 1 }));
    addConfig = vi.fn(() => of({ code: 200, msg: '' }));
    updateConfig = vi.fn(() => of({ code: 200, msg: '' }));
    delConfig = vi.fn(() => of({ code: 200, msg: '' }));
    refreshCache = vi.fn(() => of({ code: 200, msg: '' }));
    download = vi.fn(() => of(undefined));
    success = vi.fn();
    getDict = vi.fn(() => [{ label: '是', value: 'Y', listClass: 'primary' }]);
    loadDict = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        provideNzDateFnsAdapter(),
        {
          provide: ConfigApi,
          useValue: { listConfig, addConfig, updateConfig, delConfig, refreshCache },
        },
        { provide: DownloadService, useValue: { download } },
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

  function create(): ConfigPage {
    const fixture = TestBed.createComponent(ConfigPage);
    stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 发起首查', async () => {
    const page = await create();

    expect(listConfig).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      configName: undefined,
      configKey: undefined,
      configType: undefined,
    });
    expect(page.rows()).toEqual(configs);
  });

  it('日期范围转为 params[beginTime] / params[endTime]', async () => {
    const page = await create();
    page.dateRange.set([new Date(2024, 0, 2), new Date(2024, 0, 31)]);
    page.getList();

    const query = listConfig.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(query['params[beginTime]']).toBe('2024-01-02');
    expect(query['params[endTime]']).toBe('2024-01-31');
  });

  it('新增提交后调 addConfig 并提示', async () => {
    const page = await create();
    listConfig.mockClear();

    page.openAdd();
    page.form.patchValue({
      configName: '新参数',
      configKey: 'sys.new',
      configValue: 'v',
    });
    page.submitForm();

    expect(addConfig).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledWith('新增成功');
    expect(listConfig).toHaveBeenCalledTimes(1);
  });

  it('编辑回填并调 updateConfig', async () => {
    const page = await create();

    page.openEdit(configs[0]);
    expect(page.form.controls.configKey.value).toBe('sys.index.skinName');

    page.submitForm();
    expect(updateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ configId: 1, configName: '主框架页' }),
    );
  });

  it('删除走确认框', async () => {
    const page = await create();
    listConfig.mockClear();

    page.delete(configs[0]);

    expect(delConfig).toHaveBeenCalledWith([1]);
    expect(success).toHaveBeenCalledWith('删除成功');
  });

  it('refreshCache 调用并提示成功', async () => {
    const page = await create();

    page.refreshCache();

    expect(refreshCache).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledWith('刷新缓存成功');
  });

  it('导出剥离分页参数', async () => {
    const page = await create();

    page.export();

    expect(download).toHaveBeenCalledWith(
      '/system/config/export',
      { configName: undefined, configKey: undefined, configType: undefined },
      expect.stringMatching(/^config_\d{14}\.xlsx$/),
    );
  });
});
