import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '../../core/request.service';
import { AjaxResult, TableDataInfo, PageQuery } from '../../core/models/result';
import { SysOperLog } from '../../core/models/monitor';

/** 操作日志接口，对应 ruoyi-vue3/src/api/monitor/operlog.js */
@Injectable({ providedIn: 'root' })
export class OperlogApi {
  private readonly request = inject(RequestService);

  listOperlog(query: PageQuery): Observable<TableDataInfo<SysOperLog>> {
    return this.request.get<TableDataInfo<SysOperLog>>('/monitor/operlog/list', query);
  }

  delOperlog(operId: number | string | number[]): Observable<AjaxResult> {
    const ids = Array.isArray(operId) ? operId.join(',') : operId;
    return this.request.delete<AjaxResult>(`/monitor/operlog/${ids}`);
  }

  cleanOperlog(): Observable<AjaxResult> {
    return this.request.delete<AjaxResult>('/monitor/operlog/clean');
  }
}
