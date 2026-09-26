import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '../../core/request.service';
import { AjaxResult, TableDataInfo, PageQuery } from '../../core/models/result';
import { SysJob } from '../../core/models/monitor';

/** 定时任务接口，对应 ruoyi-vue3/src/api/monitor/job.js */
@Injectable({ providedIn: 'root' })
export class JobApi {
  private readonly request = inject(RequestService);

  listJob(query: PageQuery): Observable<TableDataInfo<SysJob>> {
    return this.request.get<TableDataInfo<SysJob>>('/monitor/job/list', query);
  }

  getJob(jobId: number | string): Observable<AjaxResult<SysJob>> {
    return this.request.get<AjaxResult<SysJob>>(`/monitor/job/${jobId}`);
  }

  addJob(data: SysJob): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/monitor/job', data);
  }

  updateJob(data: SysJob): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/monitor/job', data);
  }

  delJob(jobId: number | string | number[]): Observable<AjaxResult> {
    const ids = Array.isArray(jobId) ? jobId.join(',') : jobId;
    return this.request.delete<AjaxResult>(`/monitor/job/${ids}`);
  }

  /** 任务状态修改：status 0正常 1暂停 */
  changeJobStatus(jobId: number | string, status: string): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/monitor/job/changeStatus', { jobId, status });
  }

  /** 立即执行一次 */
  runJob(jobId: number | string, jobGroup: string): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/monitor/job/run', { jobId, jobGroup });
  }
}
