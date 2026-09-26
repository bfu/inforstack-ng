import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '../../core/request.service';
import { AjaxResult, TableDataInfo, PageQuery } from '../../core/models/result';
import { SysNotice } from '../../core/models/system';

/** 通知公告接口，对应 ruoyi-vue3/src/api/system/notice.js */
@Injectable({ providedIn: 'root' })
export class NoticeApi {
  private readonly request = inject(RequestService);

  listNotice(query: PageQuery): Observable<TableDataInfo<SysNotice>> {
    return this.request.get<TableDataInfo<SysNotice>>('/system/notice/list', query);
  }

  getNotice(noticeId: number | string): Observable<AjaxResult<SysNotice>> {
    return this.request.get<AjaxResult<SysNotice>>(`/system/notice/${noticeId}`);
  }

  addNotice(data: SysNotice): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/system/notice', data);
  }

  updateNotice(data: SysNotice): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/notice', data);
  }

  delNotice(noticeId: number | string | number[]): Observable<AjaxResult> {
    const ids = Array.isArray(noticeId) ? noticeId.join(',') : noticeId;
    return this.request.delete<AjaxResult>(`/system/notice/${ids}`);
  }
}
