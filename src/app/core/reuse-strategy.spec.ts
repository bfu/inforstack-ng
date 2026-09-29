import { describe, expect, it, vi } from 'vitest';
import { ActivatedRouteSnapshot, DetachedRouteHandle } from '@angular/router';
import { RuoYiReuseStrategy } from './reuse-strategy';

/** 伪造 ActivatedRouteSnapshot（结构化鸭子类型） */
function makeSnapshot(opts: {
  path?: string;
  children?: unknown[];
  data?: Record<string, unknown>;
  pathFromRoot?: Array<{ url: Array<{ path: string }> }>;
}): ActivatedRouteSnapshot {
  const urlSegments = (opts.path ?? '')
    .split('/')
    .filter(Boolean)
    .map((p) => ({ path: p }));
  return {
    routeConfig: opts.path === undefined ? null : { path: opts.path },
    children: opts.children ?? [],
    data: opts.data,
    pathFromRoot: opts.pathFromRoot ?? [{ url: urlSegments }],
    params: {},
  } as unknown as ActivatedRouteSnapshot;
}

function makeHandle(): DetachedRouteHandle {
  return { componentRef: { destroy: vi.fn() } } as unknown as DetachedRouteHandle;
}

describe('RuoYiReuseStrategy', () => {
  it('无 routeConfig 或存在子路由时不缓存', () => {
    const s = new RuoYiReuseStrategy();
    expect(s.shouldDetach(makeSnapshot({ path: undefined }))).toBe(false);
    expect(s.shouldDetach(makeSnapshot({ path: 'user', children: [{}] as never[] }))).toBe(false);
  });

  it('meta.noCache 标记的页面不缓存', () => {
    const s = new RuoYiReuseStrategy();
    expect(s.shouldDetach(makeSnapshot({ path: 'user', data: { noCache: true } }))).toBe(false);
  });

  it('登录 / 注册 / 404 / 通配路由不缓存', () => {
    const s = new RuoYiReuseStrategy();
    expect(s.shouldDetach(makeSnapshot({ path: 'login' }))).toBe(false);
    expect(s.shouldDetach(makeSnapshot({ path: 'register' }))).toBe(false);
    expect(s.shouldDetach(makeSnapshot({ path: '404' }))).toBe(false);
    expect(s.shouldDetach(makeSnapshot({ path: '**' }))).toBe(false);
  });

  it('普通叶子路由缓存，store 后可 retrieve / shouldAttach', () => {
    const s = new RuoYiReuseStrategy();
    const route = makeSnapshot({ path: 'system/user' });
    const handle = makeHandle();

    expect(s.shouldDetach(route)).toBe(true);

    s.store(route, handle);
    expect(s.shouldAttach(route)).toBe(true);
    expect(s.retrieve(route)).toBe(handle);
  });

  it('store(null) 不缓存', () => {
    const s = new RuoYiReuseStrategy();
    const route = makeSnapshot({ path: 'user' });
    s.store(route, null);
    expect(s.retrieve(route)).toBeNull();
  });

  it('按完整 URL 组装缓存键（pathFromRoot 拼接）', () => {
    const s = new RuoYiReuseStrategy();
    const route = makeSnapshot({
      path: 'user',
      pathFromRoot: [
        { url: [{ path: 'system' }] },
        { url: [{ path: 'user' }, { path: 'profile' }] },
      ],
    });
    const handle = makeHandle();
    s.store(route, handle);

    const sameUrl = makeSnapshot({
      path: 'user',
      pathFromRoot: [
        { url: [{ path: 'system' }] },
        { url: [{ path: 'user' }, { path: 'profile' }] },
      ],
    });
    const otherUrl = makeSnapshot({
      path: 'user',
      pathFromRoot: [{ url: [{ path: 'monitor' }] }, { url: [{ path: 'job' }] }],
    });

    expect(s.retrieve(sameUrl)).toBe(handle);
    expect(s.retrieve(otherUrl)).toBeNull();
  });

  it('shouldReuseRoute：同配置同参数才复用', () => {
    const s = new RuoYiReuseStrategy();
    const config = { path: 'user' };
    const a = { routeConfig: config, params: { id: 1 } } as unknown as ActivatedRouteSnapshot;
    const b = { routeConfig: config, params: { id: 1 } } as unknown as ActivatedRouteSnapshot;
    const c = { routeConfig: config, params: { id: 2 } } as unknown as ActivatedRouteSnapshot;

    expect(s.shouldReuseRoute(a, b)).toBe(true);
    expect(s.shouldReuseRoute(a, c)).toBe(false);
  });

  it('clear 销毁指定路径缓存并移除', () => {
    const s = new RuoYiReuseStrategy();
    const route = makeSnapshot({ path: 'system/user' });
    const handle = makeHandle();
    s.store(route, handle);

    s.clear('/system/user');

    expect(
      (handle as { componentRef: { destroy: ReturnType<typeof vi.fn> } }).componentRef.destroy,
    ).toHaveBeenCalled();
    expect(s.retrieve(route)).toBeNull();
  });

  it('clearAll 销毁全部缓存', () => {
    const s = new RuoYiReuseStrategy();
    const h1 = makeHandle();
    const h2 = makeHandle();
    s.store(makeSnapshot({ path: 'system/user' }), h1);
    s.store(makeSnapshot({ path: 'monitor/job' }), h2);

    s.clearAll();

    const d1 = (h1 as { componentRef: { destroy: ReturnType<typeof vi.fn> } }).componentRef.destroy;
    const d2 = (h2 as { componentRef: { destroy: ReturnType<typeof vi.fn> } }).componentRef.destroy;
    expect(d1).toHaveBeenCalled();
    expect(d2).toHaveBeenCalled();
    expect(s.shouldAttach(makeSnapshot({ path: 'system/user' }))).toBe(false);
    expect(s.shouldAttach(makeSnapshot({ path: 'monitor/job' }))).toBe(false);
  });
});
