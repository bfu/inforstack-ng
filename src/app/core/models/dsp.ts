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

/** 数据库实例（MySQL 库名 / PostgreSQL、Oracle 模式） */
export interface DspInstanceInfo {
  /** 展示名称 */
  name?: string;
  /** JDBC catalog（可为空） */
  catalog?: string;
  /** JDBC schema（可为空） */
  schema?: string;
  /** 实例类型：catalog / schema */
  type?: string;
  /** 是否为当前连接默认实例 */
  current?: boolean;
}

/** 数据表信息 */
export interface DspTableInfo {
  tableName?: string;
  tableComment?: string;
  tableType?: string;
}

/** 数据表字段结构 */
export interface DspColumnInfo {
  columnName?: string;
  columnComment?: string;
  columnType?: string;
  javaType?: string;
  javaField?: string;
  primaryKey?: boolean;
  required?: boolean;
  autoIncrement?: boolean;
  ordinal?: number;
}

/** 元数据查询条件（数据源 → 实例 → 表） */
export interface DspMetaQuery {
  dataSourceId?: number;
  catalog?: string;
  schema?: string;
  tableName?: string;
}

/** 脚本生成器产出的单条脚本（尚未落库） */
export interface DspGeneratedScript {
  /** 操作标识 selectAll/selectPage/insertBatch/insertOne/update/delete */
  action?: string;
  /** 操作中文名：查询所有/翻页查询/批量添加/单条添加/修改/删除 */
  actionName?: string;
  /** MyBatis 语句类型：SELECT/INSERT/UPDATE/DELETE */
  sqlCommandType?: string;
  /** 脚本名称（默认由表名与表注释推导，可修改） */
  name?: string;
  /** 脚本标识（默认由表名与操作推导，可修改） */
  slug?: string;
  description?: string;
  /** 语句片段（单条语句，不写 id 与 namespace） */
  content?: string;
}

/** 脚本生成预览结果 */
export interface DspGeneratePreview {
  dataSourceId?: number;
  catalog?: string;
  schema?: string;
  tableName?: string;
  tableComment?: string;
  /** 数据库产品名（决定翻页方言） */
  databaseProduct?: string;
  columns?: DspColumnInfo[];
  scripts?: DspGeneratedScript[];
}

/** 批量生成脚本请求 */
export interface DspGenerateRequest {
  dataSourceId?: number;
  scripts?: DspGeneratedScript[];
}
