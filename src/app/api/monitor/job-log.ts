import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '../../core/request.service';
import { AjaxResult, TableDataInfo, PageQuery } from '../../core/models/result';
import { SysJobLog } from '../../core/models/monitor';

/** 定时任务调度日志接口，对应 ruoyi-vue3/src/api/monitor/jobLog.js */
@Injectable({ providedIn: 'root' })
export class JobLogApi {
  private readonly request = inject(RequestService);

  listJobLog(query: PageQuery): Observable<TableDataInfo<SysJobLog>> {
    return this.request.get<TableDataInfo<SysJobLog>>('/monitor/jobLog/list', query);
  }

  getJobLog(jobLogId: number | string): Observable<AjaxResult<SysJobLog>> {
    return this.request.get<AjaxResult<SysJobLog>>(`/monitor/jobLog/${jobLogId}`);
  }

  delJobLog(jobLogId: number | string | number[]): Observable<AjaxResult> {
    const ids = Array.isArray(jobLogId) ? jobLogId.join(',') : jobLogId;
    return this.request.delete<AjaxResult>(`/monitor/jobLog/${ids}`);
  }

  cleanJobLog(): Observable<AjaxResult> {
    return this.request.delete<AjaxResult>('/monitor/jobLog/clean');
  }
}
