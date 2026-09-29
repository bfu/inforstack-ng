import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { environment } from '@env/environment';
import { DruidPage } from './druid';

describe('DruidPage 数据监控', () => {
  async function create(): Promise<DruidPage> {
    const fixture = TestBed.createComponent(DruidPage);
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  it('构造成功且 iframe 地址指向 druid 控制台', async () => {
    const page = await create();

    expect(page.url).toBe(`${environment.apiBaseUrl}/druid/login.html`);
  });
});
