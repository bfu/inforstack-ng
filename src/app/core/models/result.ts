/**
 * 后端统一响应模型
 * 对应 com.ruoyi.common.core.domain.AjaxResult / TableDataInfo
 */

/** 通用返回对象 */
export interface AjaxResult<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

/** 分页返回对象 */
export interface TableDataInfo<T> {
  code: number;
  msg: string;
  total: number;
  rows: T[];
}

/** 分页查询参数 */
export interface PageQuery {
  pageNum: number;
  pageSize: number;
  [key: string]: unknown;
}

/** 树形下拉节点 */
export interface TreeSelectNode<T = unknown> {
  id: number;
  label: string;
  parentId?: number;
  children?: TreeSelectNode<T>[];
  [key: string]: unknown;
}
