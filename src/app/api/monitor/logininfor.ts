import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '@core/request.service';
import { AjaxResult, TableDataInfo, PageQuery } from '@core/models/result';
import { SysLogininfor } from '@core/models/monitor';

/** 登录日志接口，对应 ruoyi-vue3/src/api/monitor/logininfor.js */
@Injectable({ providedIn: 'root' })
export class LogininforApi {
  private readonly request = inject(RequestService);

  listLogininfor(query: PageQuery): Observable<TableDataInfo<SysLogininfor>> {
    return this.request.get<TableDataInfo<SysLogininfor>>('/monitor/logininfor/list', query);
  }

  delLogininfor(infoId: number | string | number[]): Observable<AjaxResult> {
    const ids = Array.isArray(infoId) ? infoId.join(',') : infoId;
    return this.request.delete<AjaxResult>(`/monitor/logininfor/${ids}`);
  }

  cleanLogininfor(): Observable<AjaxResult> {
    return this.request.delete<AjaxResult>('/monitor/logininfor/clean');
  }

  /** 解锁账号 */
  unlockLogininfor(userName: string): Observable<AjaxResult> {
    return this.request.get<AjaxResult>(`/monitor/logininfor/unlock/${encodeURIComponent(userName)}`);
  }
}
