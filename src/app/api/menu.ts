import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '../core/request.service';
import { RouterVo } from '../core/models/system';

export interface RoutersResult {
  code: number;
  msg: string;
  data: RouterVo[];
}

/** 菜单路由接口，对应 ruoyi-vue3/src/api/menu.js */
@Injectable({ providedIn: 'root' })
export class MenuApi {
  private readonly request = inject(RequestService);

  getRouters(): Observable<RoutersResult> {
    return this.request.get<RoutersResult>('/getRouters');
  }
}
