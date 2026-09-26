import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '@core/request.service';
import { AjaxResult, TableDataInfo } from '@core/models/result';
import { SysUserOnline } from '@core/models/monitor';

/**
 * 在线用户接口，对应 ruoyi-vue3/src/api/monitor/online.js
 * 注意：后端一次返回全部在线会话，分页由前端本地切片完成
 */
@Injectable({ providedIn: 'root' })
export class OnlineApi {
  private readonly request = inject(RequestService);

  listOnline(query: Record<string, unknown>): Observable<TableDataInfo<SysUserOnline>> {
    return this.request.get<TableDataInfo<SysUserOnline>>('/monitor/online/list', query);
  }

  /** 强退用户 */
  forceLogout(tokenId: string): Observable<AjaxResult> {
    return this.request.delete<AjaxResult>(`/monitor/online/${encodeURIComponent(tokenId)}`);
  }
}
