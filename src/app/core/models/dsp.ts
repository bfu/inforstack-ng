/**
 * MyBatis 动态脚本平台领域模型
 * 字段与 com.ruoyi.dsp.domain 下实体一一对应
 */
import { BaseEntity } from '@core/models/system';

/** 脚本定义 dsp_script */
export interface DspScript extends BaseEntity {
  scriptId?: number;
  /** 唯一标识，同时作为 MyBatis namespace（完整语句 id 为 slug.语句名） */
  slug?: string;
  name?: string;
  description?: string;
  /** 草稿语句片段（xml 声明、DOCTYPE、mapper 标签与 namespace 由后端补全） */
  content?: string;
  /** 当前已发布版本号（0=未发布） */
  currentVersion?: number;
  /** 状态 0草稿 1已发布 2已下线 */
  status?: string;
}

/** 脚本版本历史 dsp_script_version */
export interface DspScriptVersion extends BaseEntity {
  versionId?: number;
  scriptId?: number;
  slug?: string;
  version?: number;
  content?: string;
  /** 0历史版本 1当前版本 */
  status?: string;
  publishBy?: string;
  publishTime?: string;
}

/** 脚本校验结果 */
export interface DspValidationResult {
  valid?: boolean;
  /** 运行时命名空间（脚本 slug） */
  namespace?: string;
  statements?: string[];
  errors?: string[];
  warnings?: string[];
}

/** 脚本执行结果 */
export interface DspExecutionResult {
  sqlCommandType?: string;
  rows?: Record<string, unknown>[] | null;
  affectedRows?: number | null;
  costMillis?: number;
  rollback?: boolean;
  success?: boolean;
  message?: string;
}
