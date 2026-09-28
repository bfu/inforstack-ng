import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '@core/request.service';
import { AjaxResult } from '@core/models/result';
import { CacheInfo, SysCache } from '@core/models/monitor';

/**
 * 缓存监控接口，对应 ruoyi-vue3/src/api/monitor/cache.js
 * 注意：cacheKey 形如 login_tokens:xxx，需编码后再拼入路径
 */
@Injectable({ providedIn: 'root' })
export class CacheApi {
  private readonly request = inject(RequestService);

  /** 缓存监控基本信息（Redis info + dbSize + 命令统计） */
  getCache(): Observable<AjaxResult<CacheInfo>> {
    return this.request.get<AjaxResult<CacheInfo>>('/monitor/cache');
  }

  /** 缓存名称列表 */
  getCacheNames(): Observable<AjaxResult<SysCache[]>> {
    return this.request.get<AjaxResult<SysCache[]>>('/monitor/cache/getNames');
  }

  /** 指定缓存名称下的键名列表 */
  getCacheKeys(cacheName: string): Observable<AjaxResult<string[]>> {
    return this.request.get<AjaxResult<string[]>>(
      `/monitor/cache/getKeys/${encodeURIComponent(cacheName)}`,
    );
  }

  /** 指定键名的缓存内容 */
  getCacheValue(cacheName: string, cacheKey: string): Observable<AjaxResult<SysCache>> {
    const url = `/monitor/cache/getValue/${encodeURIComponent(cacheName)}/${encodeURIComponent(cacheKey)}`;
    return this.request.get<AjaxResult<SysCache>>(url);
  }

  /** 清理指定名称下的全部缓存 */
  clearCacheName(cacheName: string): Observable<AjaxResult> {
    return this.request.delete<AjaxResult>(
      `/monitor/cache/clearCacheName/${encodeURIComponent(cacheName)}`,
    );
  }

  /** 清理指定键名 */
  clearCacheKey(cacheKey: string): Observable<AjaxResult> {
    return this.request.delete<AjaxResult>(
      `/monitor/cache/clearCacheKey/${encodeURIComponent(cacheKey)}`,
    );
  }

  /** 清理全部缓存 */
  clearCacheAll(): Observable<AjaxResult> {
    return this.request.delete<AjaxResult>('/monitor/cache/clearCacheAll');
  }
}
