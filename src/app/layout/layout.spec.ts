import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { environment } from '@env/environment';
import { PermissionStore } from '@store/permission.store';
import { UserStore } from '@store/user.store';
import { Layout } from './layout';

describe('Layout 主框架布局', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PermissionStore, useValue: { sidebarRouters: vi.fn(() => []) } },
        {
          provide: UserStore,
          useValue: {
            nickName: vi.fn(() => '若依'),
            name: vi.fn(() => 'ry'),
            logOut: vi.fn(() => of({ code: 200, msg: '' })),
            clearSession: vi.fn(),
            hasPermi: vi.fn(() => true),
            hasRole: vi.fn(() => true),
          },
        },
        { provide: NzModalService, useValue: { confirm: vi.fn(), create: vi.fn() } },
        {
          provide: NzMessageService,
          useValue: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
        },
      ],
    });
  });

  /**
   * 只测外壳自身的响应式逻辑：permission.store 与 layout 存在双向依赖
   * （动态路由需要 Layout 作为父级组件），整体渲染会在测试中触发 NG0919，
   * 故清空模板、不实例化子组件
   */
  function create(): Layout {
    TestBed.overrideComponent(Layout, { set: { imports: [], template: '' } });
    const fixture = TestBed.createComponent(Layout);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  /** jsdom 默认 1024 宽，需显式改写以覆盖断点分支 */
  function setWidth(width: number): void {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  }

  it('宽屏时为桌面端', () => {
    setWidth(1280);
    const layout = create();

    expect(layout.app.device()).toBe('desktop');
    expect(layout.footerContent).toBe(environment.footerContent);
  });

  it('窗口 resize 到窄屏切换移动端并收起侧边栏', () => {
    setWidth(1280);
    const layout = create();

    setWidth(500);
    layout.onResize({ target: window } as unknown as UIEvent);

    expect(layout.app.device()).toBe('mobile');
    expect(layout.app.sidebarOpened()).toBe(false);
  });
});
