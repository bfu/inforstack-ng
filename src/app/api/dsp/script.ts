import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '@core/request.service';
import { AjaxResult, TableDataInfo, PageQuery } from '@core/models/result';
import {
  DspExecutionResult,
  DspScript,
  DspScriptVersion,
  DspValidationResult,
} from '@core/models/dsp';

/** 动态脚本平台接口，对应 com.ruoyi.dsp.controller */
@Injectable({ providedIn: 'root' })
export class DspScriptApi {
  private readonly request = inject(RequestService);

  /** 脚本列表 */
  listScript(query: PageQuery): Observable<TableDataInfo<DspScript>> {
    return this.request.get<TableDataInfo<DspScript>>('/dsp/script/list', query);
  }

  /** 脚本详情（含草稿内容） */
  getScript(scriptId: number): Observable<AjaxResult<DspScript>> {
    return this.request.get<AjaxResult<DspScript>>(`/dsp/script/${scriptId}`);
  }

  /** 新增脚本 */
  addScript(data: DspScript): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/dsp/script', data);
  }

  /** 修改脚本（保存草稿） */
  updateScript(data: DspScript): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/dsp/script', data);
  }

  /** 删除脚本 */
  delScript(scriptId: number | number[]): Observable<AjaxResult> {
    const ids = Array.isArray(scriptId) ? scriptId.join(',') : scriptId;
    return this.request.delete<AjaxResult>(`/dsp/script/${ids}`);
  }

  /**
   * 校验脚本（content 为空时校验库中草稿）
   *
   * @param dataSourceId 用于判定方言的数据源 ID，缺省用脚本当前绑定值（回滚时需传版本绑定的数据源）
   */
  validate(
    scriptId: number,
    content?: string,
    dataSourceId?: number,
  ): Observable<AjaxResult<DspValidationResult>> {
    return this.request.post<AjaxResult<DspValidationResult>>('/dsp/script/validate', {
      scriptId,
      content,
      dataSourceId,
    });
  }

  /** 测试脚本语句（事务回滚预览） */
  test(
    scriptId: number,
    statementId: string,
    params?: Record<string, unknown>,
  ): Observable<AjaxResult<DspExecutionResult>> {
    return this.request.post<AjaxResult<DspExecutionResult>>('/dsp/script/test', {
      scriptId,
      statementId,
      params,
    });
  }

  /** 发布脚本，返回新版本号 */
  publish(scriptId: number): Observable<AjaxResult<number>> {
    return this.request.post<AjaxResult<number>>('/dsp/script/publish', { scriptId });
  }

  /** 回滚到指定版本 */
  rollback(scriptId: number, versionId: number): Observable<AjaxResult<number>> {
    return this.request.post<AjaxResult<number>>('/dsp/script/rollback', { scriptId, versionId });
  }

  /** 下线脚本 */
  offline(scriptId: number): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/dsp/script/offline', { scriptId });
  }

  /** 重新加载全部已发布脚本 */
  reload(): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/dsp/script/reload');
  }

  /** 版本列表 */
  listVersions(scriptId: number): Observable<AjaxResult<DspScriptVersion[]>> {
    return this.request.get<AjaxResult<DspScriptVersion[]>>(`/dsp/script/versions/${scriptId}`);
  }

  /** 版本详情（含内容快照） */
  getVersion(versionId: number): Observable<AjaxResult<DspScriptVersion>> {
    return this.request.get<AjaxResult<DspScriptVersion>>(`/dsp/script/version/${versionId}`);
  }

  /** 统一执行已发布脚本的（唯一）语句 */
  exec(slug: string, params?: Record<string, unknown>): Observable<AjaxResult<DspExecutionResult>> {
    return this.request.post<AjaxResult<DspExecutionResult>>(`/dsp/exec/${slug}`, params);
  }
}
