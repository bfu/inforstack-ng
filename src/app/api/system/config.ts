import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '@core/request.service';
import { AjaxResult, TableDataInfo, PageQuery } from '@core/models/result';
import { SysConfig } from '@core/models/system';

/** 参数设置接口，对应 ruoyi-vue3/src/api/system/config.js */
@Injectable({ providedIn: 'root' })
export class ConfigApi {
  private readonly request = inject(RequestService);

  listConfig(query: PageQuery): Observable<TableDataInfo<SysConfig>> {
    return this.request.get<TableDataInfo<SysConfig>>('/system/config/list', query);
  }

  getConfig(configId: number | string): Observable<AjaxResult<SysConfig>> {
    return this.request.get<AjaxResult<SysConfig>>(`/system/config/${configId}`);
  }

  /** 根据参数键名查询参数值 */
  getConfigKey(key: string): Observable<AjaxResult<string>> {
    return this.request.get<AjaxResult<string>>(`/system/config/configKey/${key}`);
  }

  addConfig(data: SysConfig): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/system/config', data);
  }

  updateConfig(data: SysConfig): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/config', data);
  }

  delConfig(configId: number | string | number[]): Observable<AjaxResult> {
    const ids = Array.isArray(configId) ? configId.join(',') : configId;
    return this.request.delete<AjaxResult>(`/system/config/${ids}`);
  }

  /** 刷新参数缓存 */
  refreshCache(): Observable<AjaxResult> {
    return this.request.delete<AjaxResult>('/system/config/refreshCache');
  }
}
