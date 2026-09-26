/**
 * 监控管理领域模型
 * 字段与后端 com.ruoyi.system.domain / com.ruoyi.quartz.domain 下的实体一一对应
 */
import { BaseEntity } from './system';

/** 操作日志 sys_oper_log */
export interface SysOperLog extends BaseEntity {
  operId?: number;
  title?: string;
  /** 业务类型：0其它 1新增 2修改 3删除 4授权 5导出 6导入 7强退 8生成代码 9清空数据 */
  businessType?: number;
  /** 操作方法（类#方法） */
  method?: string;
  requestMethod?: string;
  /** 操作类别：0其它 1后台用户 2手机端用户 */
  operatorType?: number;
  operName?: string;
  deptName?: string;
  operUrl?: string;
  operIp?: string;
  operLocation?: string;
  operParam?: string;
  jsonResult?: string;
  /** 0正常 1异常 */
  status?: number;
  errorMsg?: string;
  operTime?: string;
  /** 消耗时间(毫秒) */
  costTime?: number;
}

/** 登录日志 sys_logininfor */
export interface SysLogininfor extends BaseEntity {
  infoId?: number;
  userName?: string;
  /** 登录状态：0成功 1失败 */
  status?: string;
  ipaddr?: string;
  loginLocation?: string;
  browser?: string;
  os?: string;
  msg?: string;
  loginTime?: string;
}

/** 在线用户（后端在线用户会话，非数据库实体） */
export interface SysUserOnline {
  /** 会话编号 */
  tokenId?: string;
  deptName?: string;
  userName?: string;
  ipaddr?: string;
  loginLocation?: string;
  browser?: string;
  os?: string;
  /** 登录时间戳 */
  loginTime?: number;
}

/** 定时任务 sys_job */
export interface SysJob extends BaseEntity {
  jobId?: number;
  jobName?: string;
  jobGroup?: string;
  invokeTarget?: string;
  cronExpression?: string;
  /** 执行策略：0默认 1立即触发执行 2触发一次执行 3不触发立即执行 */
  misfirePolicy?: string;
  /** 是否并发：0允许 1禁止 */
  concurrent?: string;
  /** 任务状态：0正常 1暂停 */
  status?: string;
  /** 下次执行时间（后端计算） */
  nextValidTime?: string;
}

/** 定时任务日志 sys_job_log */
export interface SysJobLog extends BaseEntity {
  jobLogId?: number;
  jobName?: string;
  jobGroup?: string;
  invokeTarget?: string;
  jobMessage?: string;
  /** 执行状态：0正常 1失败 */
  status?: string;
  exceptionInfo?: string;
  startTime?: string;
  endTime?: string;
}

/** 服务监控 - CPU */
export interface ServerCpu {
  cpuNum?: number;
  total?: number;
  sys?: number;
  used?: number;
  wait?: number;
  free?: number;
}

/** 服务监控 - 内存（单位 G） */
export interface ServerMem {
  total?: number;
  used?: number;
  free?: number;
  usage?: number;
}

/** 服务监控 - JVM（单位 M） */
export interface ServerJvm {
  total?: number;
  max?: number;
  free?: number;
  used?: number;
  usage?: number;
  version?: string;
  home?: string;
  name?: string;
  startTime?: string;
  runTime?: string;
  inputArgs?: string;
}

/** 服务监控 - 服务器信息 */
export interface ServerSys {
  computerName?: string;
  computerIp?: string;
  osName?: string;
  osArch?: string;
  userDir?: string;
}

/** 服务监控 - 磁盘状态 */
export interface ServerSysFile {
  dirName?: string;
  sysTypeName?: string;
  typeName?: string;
  total?: string;
  free?: string;
  used?: string;
  usage?: number;
}

/** 服务监控 /monitor/server 返回值 */
export interface ServerInfo {
  cpu?: ServerCpu;
  mem?: ServerMem;
  jvm?: ServerJvm;
  sys?: ServerSys;
  sysFiles?: ServerSysFile[];
}

/** 缓存监控 - 命令统计项 */
export interface CacheCommandStat {
  name?: string;
  /** 后端返回的是字符串形式的数值 */
  value?: string;
}

/** 缓存监控 /monitor/cache 返回值 */
export interface CacheInfo {
  /** Redis INFO 键值对 */
  info?: Record<string, string>;
  dbSize?: number;
  commandStats?: CacheCommandStat[];
}

/** 缓存条目 sys_cache */
export interface SysCache {
  cacheName?: string;
  cacheKey?: string;
  cacheValue?: string;
  remark?: string;
}
