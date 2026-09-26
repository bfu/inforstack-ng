/**
 * 代码生成模型
 * 对应后端 com.ruoyi.generator.domain.GenTable / GenTableColumn
 */

/**
 * 默认前端类型，取值与后端 VelocityUtils.ANGULAR 保持一致
 * 导入表、创建表、编辑配置均需显式传入 tplWebType
 */
export const DEFAULT_TPL_WEB_TYPE = 'angular';

/**
 * 生成表列
 * 注意：后端 isPk/isInsert/... 均为 char(1) 字符串，取值 "0" / "1"，不可转布尔或数字
 */
export interface GenTableColumn {
  columnId?: number;
  tableId?: number;
  /** 列名称 */
  columnName?: string;
  /** 列描述 */
  columnComment?: string;
  /** 物理类型（含长度，如 varchar(100)） */
  columnType?: string;
  /** Java 类型：Long/String/Integer/Double/BigDecimal/Date/Boolean */
  javaType?: string;
  /** Java 属性名 */
  javaField?: string;
  isPk?: string;
  isIncrement?: string;
  isInsert?: string;
  isEdit?: string;
  isList?: string;
  isQuery?: string;
  /** 查询方式：EQ/NE/GT/GTE/LT/LTE/LIKE/BETWEEN */
  queryType?: string;
  isRequired?: string;
  /** 显示类型：input/textarea/select/radio/checkbox/datetime/imageUpload/fileUpload/editor */
  htmlType?: string;
  dictType?: string;
  /** 排序号，从 1 开始 */
  sort?: number;
  createTime?: string;
  updateTime?: string;
}

/** 生成业务表 */
export interface GenTable {
  tableId?: number;
  tableName?: string;
  tableComment?: string;
  /** 关联子表的表名（主子表模板） */
  subTableName?: string;
  /** 子表关联的外键名 */
  subTableFkName?: string;
  /** 实体类名称 */
  className?: string;
  /** 生成模板：crud 单表 / tree 树表 / sub 主子表 */
  tplCategory?: 'crud' | 'tree' | 'sub';
  /** 前端类型：angular / element-plus / element-plus-typescript */
  tplWebType?: string;
  packageName?: string;
  moduleName?: string;
  businessName?: string;
  functionName?: string;
  functionAuthor?: string;
  /** 表单布局：1 单列 / 2 双列 / 3 三列 */
  formColNum?: number;
  /** 生成方式：0 zip 压缩包 / 1 自定义路径 */
  genType?: '0' | '1';
  genPath?: string;
  /** 其它生成选项（JSON 字符串，由 params 序列化而来） */
  options?: string;
  /** 树编码字段（options.treeCode） */
  treeCode?: string;
  /** 树父编码字段（options.treeParentCode） */
  treeParentCode?: string;
  /** 树名称字段（options.treeName） */
  treeName?: string;
  /** 上级菜单（options.parentMenuId） */
  parentMenuId?: number;
  parentMenuName?: string;
  /** 是否生成详情页（options.genView），后端由 isView() 序列化为 view */
  view?: boolean;
  /** 后端 isCrud()/isTree()/isSub() 序列化出的附加属性 */
  crud?: boolean;
  tree?: boolean;
  sub?: boolean;
  remark?: string;
  createTime?: string;
  updateTime?: string;
  columns?: GenTableColumn[];
  /** 提交时的扩展参数载体，后端会整体序列化进 options */
  params?: Record<string, unknown>;
}

/** GET /tool/gen/{tableId} 返回结构 */
export interface GenDetail {
  /** 表信息（含 columns） */
  info: GenTable;
  /** 字段列表 */
  rows: GenTableColumn[];
  /** 全部已导入表（供主子表下拉使用） */
  tables: GenTable[];
}

/** GET /tool/gen/preview/{tableId} 返回结构：模板路径 → 代码文本 */
export type GenPreview = Record<string, string>;
