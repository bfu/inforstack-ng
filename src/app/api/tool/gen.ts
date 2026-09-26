import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '@core/request.service';
import { AjaxResult, PageQuery, TableDataInfo } from '@core/models/result';
import { GenDetail, GenPreview, GenTable } from '@core/models/tool';
import { tansParams } from '@core/utils/ruoyi';

/** 代码生成接口，对应 ruoyi-vue3/src/api/tool/gen.js */
@Injectable({ providedIn: 'root' })
export class GenApi {
  private readonly request = inject(RequestService);

  /** 查询生成表列表 */
  listTable(query: PageQuery): Observable<TableDataInfo<GenTable>> {
    return this.request.get<TableDataInfo<GenTable>>('/tool/gen/list', query);
  }

  /** 查询数据库未导入的表列表 */
  listDbTable(query: PageQuery): Observable<TableDataInfo<GenTable>> {
    return this.request.get<TableDataInfo<GenTable>>('/tool/gen/db/list', query);
  }

  /** 查询表详细信息（info/rows/tables） */
  getGenTable(tableId: number | string): Observable<AjaxResult<GenDetail>> {
    return this.request.get<AjaxResult<GenDetail>>(`/tool/gen/${tableId}`);
  }

  /** 导入表（后端为 @RequestParam，需拼接 query string） */
  importTable(params: { tables: string; tplWebType: string }): Observable<AjaxResult> {
    return this.request.post<AjaxResult>(`/tool/gen/importTable?${tansParams(params).slice(0, -1)}`);
  }

  /** 创建表（后端为 @RequestParam，需拼接 query string） */
  createTable(params: { sql: string; tplWebType: string }): Observable<AjaxResult> {
    return this.request.post<AjaxResult>(`/tool/gen/createTable?${tansParams(params).slice(0, -1)}`);
  }

  /** 修改代码生成信息 */
  updateGenTable(data: GenTable): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/tool/gen', data);
  }

  /** 删除表数据 */
  delTable(tableId: number | string | number[]): Observable<AjaxResult> {
    const ids = Array.isArray(tableId) ? tableId.join(',') : tableId;
    return this.request.delete<AjaxResult>(`/tool/gen/${ids}`);
  }

  /** 预览生成代码 */
  previewTable(tableId: number | string): Observable<AjaxResult<GenPreview>> {
    return this.request.get<AjaxResult<GenPreview>>(`/tool/gen/preview/${tableId}`);
  }

  /** 生成代码到自定义路径 */
  genCode(tableName: string): Observable<AjaxResult> {
    return this.request.get<AjaxResult>(`/tool/gen/genCode/${tableName}`);
  }

  /** 同步数据库表结构 */
  synchDb(tableName: string): Observable<AjaxResult> {
    return this.request.get<AjaxResult>(`/tool/gen/synchDb/${tableName}`);
  }
}
