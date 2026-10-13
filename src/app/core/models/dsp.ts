/**
 * MyBatis 动态脚本平台领域模型
 * 字段与 com.ruoyi.dsp.domain 下实体一一对应
 */
import { BaseEntity } from '@core/models/system';

/** 脚本定义 dsp_script */
export interface DspScript extends BaseEntity {
  scriptId?: number;
  /** 唯一标识，作为语句 id 与调用路径（完整语句 id 为 脚本ID.slug，由后端拼接） */
  slug?: string;
  name?: string;
  description?: string;
  /** 关联数据源ID（0=默认主库） */
  dataSourceId?: number;
  /** 草稿内容：一条语句片段（不写 id，mapper 标签与 namespace 由后端补全） */
  content?: string;
  /** 当前已发布版本号（0=未发布） */
  currentVersion?: number;
  /** 状态 0草稿 1已发布 2已下线 */
  status?: string;
}

/** 数据源定义 dsp_data_source */
export interface DspDataSource extends BaseEntity {
  dataSourceId?: number;
  /** 数据源名称（唯一） */
  name?: string;
  /** 数据库类型标识（仅展示，如 mysql/postgresql） */
  dbType?: string;
  /** 驱动类名 */
  driverClassName?: string;
  /** JDBC URL */
  url?: string;
  username?: string;
  /** 密码（明文） */
  password?: string;
  /** 状态 0正常 1停用 */
  status?: string;
}

/** 数据源连接测试结果 */
export interface DspDataSourceTestResult {
  success?: boolean;
  message?: string;
  costMillis?: number;
}

/** 脚本版本历史 dsp_script_version */
export interface DspScriptVersion extends BaseEntity {
  versionId?: number;
  scriptId?: number;
  slug?: string;
  version?: number;
  content?: string;
  /** 发布时绑定的数据源ID（0=默认主库），回滚时一并还原 */
  dataSourceId?: number;
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
