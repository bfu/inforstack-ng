import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { CacheApi } from '@api/monitor/cache';
import { SysCache } from '@core/models/monitor';
import { CacheListPage } from './cache-list';

type Mock = ReturnType<typeof vi.fn>;

describe('CacheListPage 缓存列表', () => {
  let api: {
    getCacheNames: Mock;
    getCacheKeys: Mock;
    getCacheValue: Mock;
    clearCacheName: Mock;
    clearCacheKey: Mock;
    clearCacheAll: Mock;
  };
  let success: Mock;

  const names: SysCache[] = [
    { cacheName: 'sys-config', remark: '参数配置' },
    { cacheName: 'sys-dict', remark: '数据字典' },
  ];

  beforeEach(() => {
    api = {
      getCacheNames: vi.fn(() => of({ code: 200, msg: '', data: names })),
      getCacheKeys: vi.fn(() =>
        of({ code: 200, msg: '', data: ['sys-config:k1', 'sys-config:k2'] }),
      ),
      getCacheValue: vi.fn(() => of({ code: 200, msg: '', data: { cacheValue: 'v1' } })),
      clearCacheName: vi.fn(() => of({ code: 200, msg: '' })),
      clearCacheKey: vi.fn(() => of({ code: 200, msg: '' })),
      clearCacheAll: vi.fn(() => of({ code: 200, msg: '' })),
    };
    success = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: CacheApi, useValue: api },
        { provide: NzMessageService, useValue: { success, error: vi.fn(), warning: vi.fn() } },
      ],
    });
  });

  function create(): CacheListPage {
    const fixture = TestBed.createComponent(CacheListPage);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 加载缓存名列表', () => {
    const page = create();

    expect(api.getCacheNames).toHaveBeenCalledTimes(1);
    expect(page.cacheNames()).toEqual(names);
  });

  it('refreshCacheNames 重新加载并提示', () => {
    const page = create();

    page.refreshCacheNames();

    expect(api.getCacheNames).toHaveBeenCalledTimes(2);
    expect(success).toHaveBeenCalledWith('刷新缓存列表成功');
  });

  it('点击缓存名加载键名并记录当前缓存', () => {
    const page = create();

    page.getCacheKeys(names[0]);

    expect(api.getCacheKeys).toHaveBeenCalledWith('sys-config');
    expect(page.currentCacheName()).toBe('sys-config');
    expect(page.cacheKeys()).toEqual(['sys-config:k1', 'sys-config:k2']);
  });

  it('未选择缓存名时不加载键名', () => {
    const page = create();

    page.getCacheKeys();

    expect(api.getCacheKeys).not.toHaveBeenCalled();
  });

  it('refreshCacheKeys 用当前缓存名刷新', () => {
    const page = create();
    page.getCacheKeys(names[0]);

    page.refreshCacheKeys();

    expect(api.getCacheKeys).toHaveBeenCalledTimes(2);
    expect(success).toHaveBeenCalledWith('刷新键名列表成功');
  });

  it('handleCacheValue 读取缓存值', () => {
    const page = create();
    page.getCacheKeys(names[0]);

    page.handleCacheValue('sys-config:k1');

    expect(api.getCacheValue).toHaveBeenCalledWith('sys-config', 'sys-config:k1');
    expect(page.cacheForm().cacheValue).toBe('v1');
  });

  it('清理缓存名后重新加载键名', () => {
    const page = create();

    page.clearCacheName(names[0]);

    expect(api.clearCacheName).toHaveBeenCalledWith('sys-config');
    expect(success).toHaveBeenCalledWith('清理缓存名称[sys-config]成功');
    expect(api.getCacheKeys).toHaveBeenCalledWith('sys-config');
  });

  it('清理缓存键名后刷新', () => {
    const page = create();
    page.getCacheKeys(names[0]);

    page.clearCacheKey('sys-config:k1');

    expect(api.clearCacheKey).toHaveBeenCalledWith('sys-config:k1');
    expect(success).toHaveBeenCalledWith('清理缓存键名[:k1]成功');
  });

  it('clearCacheAll 清空全部缓存', () => {
    const page = create();

    page.clearCacheAll();

    expect(api.clearCacheAll).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledWith('清理全部缓存成功');
  });

  it('nameFormatter 去掉首个冒号', () => {
    const page = create();

    expect(page.nameFormatter('sys:config:1')).toBe('sysconfig:1');
    expect(page.keyFormatter('sys-config:k1')).toBe('sys-config:k1');
  });
});
