import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '@core/request.service';
import { AjaxResult } from '@core/models/result';
import {
  DspColumnInfo,
  DspDataSource,
  DspGeneratePreview,
  DspGenerateRequest,
  DspInstanceInfo,
  DspMetaQuery,
  DspScript,
  DspTableInfo,
} from '@core/models/dsp';

/** 脚本生成接口，对应 com.ruoyi.dsp.controller.DspGeneratorController */
@Injectable({ providedIn: 'root' })
export class DspGeneratorApi {
  private readonly request = inject(RequestService);

  /** 可选数据源（启用中，不含密码） */
  listDataSources(): Observable<AjaxResult<DspDataSource[]>> {
    return this.request.get<AjaxResult<DspDataSource[]>>('/dsp/generator/datasources');
  }

  /** 数据源下的实例（MySQL 库名 / PostgreSQL、Oracle 模式） */
  listInstances(dataSourceId: number): Observable<AjaxResult<DspInstanceInfo[]>> {
    return this.request.get<AjaxResult<DspInstanceInfo[]>>('/dsp/generator/instances', {
      dataSourceId,
    });
  }

  /** 实例下的数据表（tableName 支持模糊搜索） */
  listTables(query: DspMetaQuery): Observable<AjaxResult<DspTableInfo[]>> {
    return this.request.get<AjaxResult<DspTableInfo[]>>('/dsp/generator/tables', { ...query });
  }

  /** 数据表字段结构 */
  listColumns(query: DspMetaQuery): Observable<AjaxResult<DspColumnInfo[]>> {
    return this.request.get<AjaxResult<DspColumnInfo[]>>('/dsp/generator/columns', { ...query });
  }

  /** 生成预览（不落库，探测表结构可能较慢，放宽超时） */
  preview(query: DspMetaQuery): Observable<AjaxResult<DspGeneratePreview>> {
    return this.request.post<AjaxResult<DspGeneratePreview>>('/dsp/generator/preview', query, {
      timeout: 30000,
    });
  }

  /** 批量生成脚本草稿 */
  generate(data: DspGenerateRequest): Observable<AjaxResult<DspScript[]>> {
    return this.request.post<AjaxResult<DspScript[]>>('/dsp/generator/generate', data, {
      timeout: 30000,
    });
  }
}
