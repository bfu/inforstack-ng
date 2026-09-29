import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { environment } from '@env/environment';
import { SwaggerPage } from './swagger';

describe('SwaggerPage 接口文档', () => {
  async function create(): Promise<SwaggerPage> {
    const fixture = TestBed.createComponent(SwaggerPage);
    await fixture.whenStable();
    return fixture.componentInstance;
  }

  it('构造成功且 iframe 地址指向 swagger-ui', async () => {
    const page = await create();

    expect(page.url).toBe(`${environment.apiBaseUrl}/swagger-ui/index.html`);
  });
});
