import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { InnerLink } from './inner-link';

describe('InnerLink 外链页面', () => {
  let data: Record<string, unknown>;

  beforeEach(() => {
    data = { link: 'https://doc.ruoyi.vip' };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get data() {
                return data;
              },
            },
          },
        },
      ],
    });
  });

  function create(): InnerLink {
    const fixture = TestBed.createComponent(InnerLink);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('按路由 data.link 生成可信任的 iframe 地址', () => {
    const page = create();

    const url = page.safeUrl() as { changingThisBreaksApplicationSecurity?: string };
    expect(url.changingThisBreaksApplicationSecurity).toBe('https://doc.ruoyi.vip');
  });

  it('缺少 data.link 时地址为空', () => {
    data = {};
    const page = create();

    const url = page.safeUrl() as { changingThisBreaksApplicationSecurity?: string };
    expect(url.changingThisBreaksApplicationSecurity).toBe('');
  });
});
