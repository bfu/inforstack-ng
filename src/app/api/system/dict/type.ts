import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '../../../core/request.service';
import { AjaxResult, TableDataInfo, PageQuery } from '../../../core/models/result';
import { SysDictType } from '../../../core/models/system';

/** 字典类型接口，对应 ruoyi-vue3/src/api/system/dict/type.js */
@Injectable({ providedIn: 'root' })
export class DictTypeApi {
  private readonly request = inject(RequestService);

  listType(query: PageQuery): Observable<TableDataInfo<SysDictType>> {
    return this.request.get<TableDataInfo<SysDictType>>('/system/dict/type/list', query);
  }

  getType(dictId: number | string): Observable<AjaxResult<SysDictType>> {
    return this.request.get<AjaxResult<SysDictType>>(`/system/dict/type/${dictId}`);
  }

  addType(data: SysDictType): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/system/dict/type', data);
  }

  updateType(data: SysDictType): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/dict/type', data);
  }

  delType(dictId: number | string | number[]): Observable<AjaxResult> {
    const ids = Array.isArray(dictId) ? dictId.join(',') : dictId;
    return this.request.delete<AjaxResult>(`/system/dict/type/${ids}`);
  }

  /** 刷新字典缓存 */
  refreshCache(): Observable<AjaxResult> {
    return this.request.delete<AjaxResult>('/system/dict/type/refreshCache');
  }

  /** 获取字典选择框列表 */
  optionselect(): Observable<AjaxResult<SysDictType[]>> {
    return this.request.get<AjaxResult<SysDictType[]>>('/system/dict/type/optionselect');
  }
}
