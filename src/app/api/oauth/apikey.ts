import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '@core/request.service';
import { TableDataInfo, PageQuery } from '@core/models/result';
import { ApiKeyResult, OauthApiKey } from '@core/models/oauth';

/**
 * 新增/修改入参：expiresTime 需与实体区分——
 * 为空表示永久有效，必须显式传 null，后端才会清空原过期时间
 */
export interface OauthApiKeyPayload extends Omit<OauthApiKey, 'expiresTime'> {
  expiresTime?: string | null;
}

/** API Key 授权接口，对应 com.ruoyi.oauth.controller.OauthApiKeyController */
@Injectable({ providedIn: 'root' })
export class OauthApiKeyApi {
  private readonly request = inject(RequestService);

  /** 密钥列表 */
  listKey(query: PageQuery): Observable<TableDataInfo<OauthApiKey>> {
    return this.request.get<TableDataInfo<OauthApiKey>>('/oauth/apikey/list', query);
  }

  /** 密钥详情 */
  getKey(keyId: number): Observable<ApiKeyResult & { data?: OauthApiKey }> {
    return this.request.get<ApiKeyResult & { data?: OauthApiKey }>(`/oauth/apikey/${keyId}`);
  }

  /** 新增密钥，响应 apiKey 为明文（仅此一次返回） */
  addKey(data: OauthApiKeyPayload): Observable<ApiKeyResult> {
    return this.request.post<ApiKeyResult>('/oauth/apikey', data);
  }

  /** 修改密钥（名称/绑定用户/状态/过期时间；过期时间为空表示永久有效） */
  updateKey(data: OauthApiKeyPayload): Observable<ApiKeyResult> {
    return this.request.put<ApiKeyResult>('/oauth/apikey', data);
  }

  /** 重置密钥：换新密钥，旧密钥立即失效；响应 apiKey 为新明文 */
  resetKey(keyId: number): Observable<ApiKeyResult> {
    return this.request.post<ApiKeyResult>(`/oauth/apikey/reset/${keyId}`);
  }

  /** 删除密钥 */
  delKey(keyId: number | number[]): Observable<ApiKeyResult> {
    const ids = Array.isArray(keyId) ? keyId.join(',') : keyId;
    return this.request.delete<ApiKeyResult>(`/oauth/apikey/${ids}`);
  }
}
