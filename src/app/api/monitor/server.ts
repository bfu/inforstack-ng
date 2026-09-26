import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '@core/request.service';
import { AjaxResult } from '@core/models/result';
import { ServerInfo } from '@core/models/monitor';

/** 服务监控接口，对应 ruoyi-vue3/src/api/monitor/server.js */
@Injectable({ providedIn: 'root' })
export class ServerApi {
  private readonly request = inject(RequestService);

  getServer(): Observable<AjaxResult<ServerInfo>> {
    return this.request.get<AjaxResult<ServerInfo>>('/monitor/server');
  }
}
