import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '../../../core/request.service';
import { AjaxResult, TableDataInfo, PageQuery } from '../../../core/models/result';
import { SysDictData } from '../../../core/models/system';
/** 字典数据接口，对应 ruoyi-vue3/src/api/system/dict/data.js */
@Injectable({ providedIn: 'root' })
export class DictDataApi {
  private readonly request = inject(RequestService);

  listData(query: PageQuery): Observable<TableDataInfo<SysDictData>> {
    return this.request.get<TableDataInfo<SysDictData>>('/system/dict/data/list', query);
  }

  getData(dictCode: number | string): Observable<AjaxResult<SysDictData>> {
    return this.request.get<AjaxResult<SysDictData>>(`/system/dict/data/${dictCode}`);
  }

  /** 根据字典类型查询字典数据 */
  getDicts(dictType: string): Observable<AjaxResult<SysDictData[]>> {
    return this.request.get<AjaxResult<SysDictData[]>>(`/system/dict/data/type/${dictType}`);
  }

  addData(data: SysDictData): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/system/dict/data', data);
  }

  updateData(data: SysDictData): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/dict/data', data);
  }

  delData(dictCode: number | string): Observable<AjaxResult> {
    return this.request.delete<AjaxResult>(`/system/dict/data/${dictCode}`);
  }
}
