import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '@core/request.service';
import { AjaxResult, TableDataInfo, PageQuery } from '@core/models/result';
import { DspDataSource, DspDataSourceTestResult } from '@core/models/dsp';

/** 数据源管理接口，对应 com.ruoyi.dsp.controller.DspDataSourceController */
@Injectable({ providedIn: 'root' })
export class DspDataSourceApi {
  private readonly request = inject(RequestService);

  /** 数据源列表 */
  listDataSource(query: PageQuery): Observable<TableDataInfo<DspDataSource>> {
    return this.request.get<TableDataInfo<DspDataSource>>('/dsp/datasource/list', query);
  }

  /** 启用中的数据源（脚本绑定下拉，不含密码） */
  listOptions(): Observable<AjaxResult<DspDataSource[]>> {
    return this.request.get<AjaxResult<DspDataSource[]>>('/dsp/datasource/options');
  }

  /** 数据源详情（含密码） */
  getDataSource(dataSourceId: number): Observable<AjaxResult<DspDataSource>> {
    return this.request.get<AjaxResult<DspDataSource>>(`/dsp/datasource/${dataSourceId}`);
  }

  /** 新增数据源 */
  addDataSource(data: DspDataSource): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/dsp/datasource', data);
  }

  /** 修改数据源 */
  updateDataSource(data: DspDataSource): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/dsp/datasource', data);
  }

  /** 删除数据源 */
  delDataSource(dataSourceId: number | number[]): Observable<AjaxResult> {
    const ids = Array.isArray(dataSourceId) ? dataSourceId.join(',') : dataSourceId;
    return this.request.delete<AjaxResult>(`/dsp/datasource/${ids}`);
  }

  /** 测试连接（编辑场景可不回填密码，后端取库中已保存密码） */
  testConnection(data: DspDataSource): Observable<AjaxResult<DspDataSourceTestResult>> {
    return this.request.post<AjaxResult<DspDataSourceTestResult>>('/dsp/datasource/test', data, {
      timeout: 15000,
    });
  }
}
