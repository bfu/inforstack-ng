import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ServerApi } from '@api/monitor/server';
import { ServerInfo } from '@core/models/monitor';
import { ServerPage } from './server';

type Mock = ReturnType<typeof vi.fn>;

describe('ServerPage 服务监控', () => {
  let getServer: Mock;

  const server: ServerInfo = {
    cpu: { cpuNum: 8, used: 12.5, sys: 3.2, free: 84.3 },
    mem: { total: 16, used: 9, free: 7, usage: 56 },
    jvm: { name: 'OpenJDK', version: '17', total: 4096, used: 2048, free: 2048, usage: 50 },
    sys: { computerName: 'inforstack', osName: 'Windows 11', computerIp: '192.168.1.10' },
    sysFiles: [
      { dirName: 'C:', typeName: '本地磁盘', total: '500G', free: '200G', used: '300G', usage: 60 },
      { dirName: 'D:', typeName: '本地磁盘', total: '500G', free: '50G', used: '450G', usage: 90 },
    ],
  };

  beforeEach(() => {
    getServer = vi.fn(() => of({ code: 200, msg: '', data: server }));
    TestBed.configureTestingModule({
      providers: [{ provide: ServerApi, useValue: { getServer } }],
    });
  });

  async function create(): Promise<ServerPage> {
    const fixture = TestBed.createComponent(ServerPage);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  it('ngOnInit 加载服务器信息', async () => {
    const page = await create();

    expect(getServer).toHaveBeenCalledTimes(1);
    expect(page.cpu().cpuNum).toBe(8);
    expect(page.sysFiles()).toHaveLength(2);
    expect(page.loading()).toBe(false);
  });

  it('memRows 给出四项内存指标', async () => {
    const page = await create();

    const rows = page.memRows();
    expect(rows).toHaveLength(4);
    expect(rows[0].mem).toBe('16G');
    expect(rows[3].mem).toBe('56%');
    expect(rows[3].memWarning).toBe(false);
  });

  it('使用率超过 80 时标记告警', async () => {
    const page = await create();

    expect(page.isDanger(90)).toBe(true);
    expect(page.isDanger(60)).toBe(false);
    expect(page.isDanger()).toBe(false);
  });
});
