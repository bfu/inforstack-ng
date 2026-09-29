import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { RuoYiReuseStrategy } from '@core/reuse-strategy';
import { TagsViewStore } from '@store/tags-view.store';
import { TagsView } from './tags-view';

type Mock = ReturnType<typeof vi.fn>;

describe('TagsView 多页签栏', () => {
  let events: Subject<unknown>;
  let navigateByUrl: Mock;
  let clear: Mock;
  let success: Mock;
  let snapshot: { data?: Record<string, string>; firstChild?: unknown };
  let url: string;

  beforeEach(() => {
    events = new Subject<unknown>();
    navigateByUrl = vi.fn(() => Promise.resolve(true));
    clear = vi.fn();
    success = vi.fn();
    snapshot = { data: { title: '用户管理' }, firstChild: null };
    url = '/system/user';
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            events: events.asObservable(),
            navigateByUrl,
            get url() {
              return url;
            },
            get routerState() {
              return { snapshot: { root: snapshot } };
            },
          },
        },
        { provide: RuoYiReuseStrategy, useValue: { clear, clearAll: vi.fn() } },
        { provide: NzMessageService, useValue: { success, error: vi.fn(), warning: vi.fn() } },
      ],
    });
  });

  function create(): TagsView {
    const fixture = TestBed.createComponent(TagsView);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function navigate(path: string): void {
    url = path;
    events.next(new NavigationEnd(1, path, path));
  }

  it('导航结束后登记页签并标记为当前页', () => {
    const page = create();

    navigate('/system/user');

    expect(page.views()).toHaveLength(1);
    expect(page.views()[0]).toEqual({ path: '/system/user', title: '用户管理', closable: true });
    expect(page.current()?.path).toBe('/system/user');
    expect(page.isActive(page.views()[0])).toBe(true);
  });

  it('同一路径重复导航只更新标题', () => {
    const page = create();
    navigate('/system/user');
    snapshot = { data: { title: '用户管理（新）' }, firstChild: null };

    navigate('/system/user');

    expect(page.views()).toHaveLength(1);
    expect(page.views()[0].title).toBe('用户管理（新）');
  });

  it('首页页签不可关闭', () => {
    const page = create();

    navigate('/index');

    expect(page.views()[0].closable).toBe(false);
  });

  it('go 切换到非当前页签', () => {
    const page = create();
    navigate('/system/user');
    navigate('/system/role');
    navigateByUrl.mockClear();

    page.go(page.views()[0]);

    expect(navigateByUrl).toHaveBeenCalledWith('/system/user');
  });

  it('关闭当前页签后跳到最后一个页签', () => {
    const page = create();
    navigate('/system/user');
    navigate('/system/role');
    navigateByUrl.mockClear();

    page.close(new MouseEvent('click'), page.views()[1]);

    expect(page.views()).toHaveLength(1);
    expect(clear).toHaveBeenCalledWith('/system/role');
    expect(navigateByUrl).toHaveBeenCalledWith('/system/user');
  });

  it('关闭非当前页签不跳转', () => {
    const page = create();
    navigate('/system/user');
    navigate('/system/role');
    navigateByUrl.mockClear();

    page.close(new MouseEvent('click'), page.views()[0]);

    expect(page.views()).toHaveLength(1);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('closeOthers 清除其余页签缓存', () => {
    const page = create();
    navigate('/system/user');
    navigate('/system/role');
    navigate('/system/post');

    page.closeOthers();

    expect(page.views().map((view) => view.path)).toEqual(['/system/post']);
    expect(clear).toHaveBeenCalledTimes(2);
  });

  it('closeAll 清空可关闭页签并回首页', () => {
    const page = create();
    navigate('/index');
    navigate('/system/user');

    page.closeAll();

    expect(page.views().map((view) => view.path)).toEqual(['/index']);
    expect(navigateByUrl).toHaveBeenCalledWith('/index');
  });

  it('refresh 先跳空路由再回到当前页', async () => {
    const page = create();
    navigate('/system/user');
    navigateByUrl.mockClear();

    page.refresh();
    await Promise.resolve();

    expect(clear).toHaveBeenCalledWith('/system/user');
    expect(navigateByUrl).toHaveBeenNthCalledWith(1, '/', { skipLocationChange: true });
    expect(navigateByUrl).toHaveBeenNthCalledWith(2, '/system/user');
    expect(success).toHaveBeenCalledWith('已刷新');
  });

  it('无当前页签时关闭/刷新不做处理', () => {
    const page = create();

    page.closeOthers();
    page.refresh();

    expect(clear).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('页签存储与组件共享同一份数据', () => {
    const page = create();
    navigate('/system/user');

    expect(TestBed.inject(TagsViewStore).visitedViews()).toEqual(page.views());
  });
});
