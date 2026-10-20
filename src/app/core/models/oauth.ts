/**
 * API Key 免登录授权领域模型
 * 字段与 com.ruoyi.oauth.domain.OauthApiKey 一一对应
 */
import { BaseEntity } from '@core/models/system';

/** 密钥定义 oauth_api_key */
export interface OauthApiKey extends BaseEntity {
  keyId?: number;
  /** 密钥名称（调用方备注用） */
  name?: string;
  /**
   * 密钥明文：库中不落库，仅新增/重置响应返回一次；
   * 列表与详情接口永远拿不到该值
   */
  apiKey?: string;
  /** 绑定的用户ID（免登录即代表该用户，权限与该用户登录时一致） */
  userId?: number;
  /** 绑定用户的登录名（关联查询展示） */
  userName?: string;
  /** 状态 0正常 1停用 */
  status?: string;
  /** 过期时间，为空表示永久有效 */
  expiresTime?: string;
  /** 最近使用时间 */
  lastUsedTime?: string;
}

/** 新增/重置响应：明文密钥挂在顶层（AjaxResult.put），不在 data 里 */
export interface ApiKeyResult {
  code: number;
  msg: string;
  apiKey?: string;
}
