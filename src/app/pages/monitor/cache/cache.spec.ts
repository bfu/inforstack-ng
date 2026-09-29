import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';

// jsdom 未实现 ResizeObserver / canvas，需要全局桩（与 echart.spec.ts 一致）
class ResizeObserverStub {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

const echartsMocks = vi.hoisted(() => ({
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  init: vi.fn(() => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() })),
}));
vi.mock('echarts', () => ({ init: echartsMocks.init }));

import { CacheApi } from '@api/monitor/cache';
import { CachePage } from './cache';

type Mock = ReturnType<typeof vi.fn>;

describe('CachePage 缓存监控', () => {
  let getCache: Mock;

  const cacheInfo = {
    info: {
      redis_version: '6.2.6',
      redis_mode: 'standalone',
      tcp_port: '6379',
      connected_clients: '3',
      uptime_in_days: '10',
      used_memory_human: '890.29K',
      used_cpu_user_children: '0.51',
      maxmemory_human: '0B',
      aof_enabled: '0',
      rdb_last_bgsave_status: 'ok',
      instantaneous_input_kbps: '0.10',
      instantaneous_output_kbps: '0.20',
    },
    dbSize: 12,
    commandStats: [
      { name: 'get', value: '10' },
      { name: 'set', value: '5' },
    ],
  };

  beforeEach(() => {
    getCache = vi.fn(() => of({ code: 200, msg: '', data: cacheInfo }));
    TestBed.configureTestingModule({ providers: [{ provide: CacheApi, useValue: { getCache } }] });
  });

  async function create(): Promise<CachePage> {
    const fixture = TestBed.createComponent(CachePage);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  it('ngOnInit 加载缓存信息', async () => {
    const page = await create();

    expect(getCache).toHaveBeenCalledTimes(1);
    expect(page.cache().dbSize).toBe(12);
    expect(page.loading()).toBe(false);
  });

  it('infoRows 渲染 12 行基本信息并折算运行模式', async () => {
    const page = await create();

    const rows = page.infoRows();
    expect(rows).toHaveLength(12);
    expect(rows[1].value).toBe('单机');
    expect(rows[10].value).toBe('12');
  });

  it('commandOption 将命令统计转成 ECharts 数据', async () => {
    const page = await create();

    const option = page.commandOption() as { series: Array<{ data: unknown[] }> };
    expect(option.series[0].data).toEqual([
      { name: 'get', value: 10 },
      { name: 'set', value: 5 },
    ]);
  });

  it('memoryOption 使用已用内存作为仪表盘数值', async () => {
    const page = await create();

    const option = page.memoryOption() as {
      series: Array<{ data: Array<{ value: number }> }>;
    };
    expect(option.series[0].data[0].value).toBeCloseTo(890.29, 2);
  });

  it('接口失败时结束加载', async () => {
    getCache.mockReturnValue(of({ code: 500, msg: 'boom' }));
    const page = await create();

    expect(page.loading()).toBe(false);
    expect(page.cache().dbSize).toBeUndefined();
  });
});
