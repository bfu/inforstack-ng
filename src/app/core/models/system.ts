/**
 * 系统管理领域模型
 * 字段与 com.ruoyi.common.core.domain.entity 下的后端实体一一对应
 */

/** 实体公共字段（BaseEntity） */
export interface BaseEntity {
  createBy?: string;
  createTime?: string;
  updateBy?: string;
  updateTime?: string;
  remark?: string;
  searchValue?: string;
  params?: Record<string, unknown>;
}

/** 用户 sys_user */
export interface SysUser extends BaseEntity {
  userId?: number;
  deptId?: number;
  userName?: string;
  nickName?: string;
  email?: string;
  phonenumber?: string;
  sex?: string;
  avatar?: string;
  password?: string;
  status?: string;
  delFlag?: string;
  loginIp?: string;
  loginDate?: string;
  pwdUpdateDate?: string;
  dept?: SysDept;
  roles?: SysRole[];
  roleIds?: number[];
  postIds?: number[];
  roleId?: number;
  admin?: boolean;
}

/** 角色 sys_role */
export interface SysRole extends BaseEntity {
  roleId?: number;
  roleName?: string;
  roleKey?: string;
  roleSort?: number;
  dataScope?: string;
  menuCheckStrictly?: boolean;
  deptCheckStrictly?: boolean;
  status?: string;
  delFlag?: string;
  flag?: boolean;
  menuIds?: number[];
  deptIds?: number[];
  admin?: boolean;
}

/** 部门 sys_dept */
export interface SysDept extends BaseEntity {
  deptId?: number;
  parentId?: number;
  ancestors?: string;
  deptName?: string;
  orderNum?: number;
  leader?: string;
  phone?: string;
  email?: string;
  status?: string;
  delFlag?: string;
  parentName?: string;
  children?: SysDept[];
}

/** 岗位 sys_post */
export interface SysPost extends BaseEntity {
  postId?: number;
  postCode?: string;
  postName?: string;
  postSort?: number;
  status?: string;
  flag?: boolean;
}

/** 菜单 sys_menu */
export interface SysMenu extends BaseEntity {
  menuId?: number;
  menuName?: string;
  parentName?: string;
  parentId?: number;
  orderNum?: number;
  path?: string;
  component?: string;
  query?: string;
  routeName?: string;
  isFrame?: string;
  isCache?: string;
  menuType?: string;
  visible?: string;
  status?: string;
  perms?: string;
  icon?: string;
  children?: SysMenu[];
}

/** 字典类型 sys_dict_type */
export interface SysDictType extends BaseEntity {
  dictId?: number;
  dictName?: string;
  dictType?: string;
  status?: string;
}

/** 字典数据 sys_dict_data */
export interface SysDictData extends BaseEntity {
  dictCode?: number;
  dictSort?: number;
  dictLabel?: string;
  dictValue?: string;
  dictType?: string;
  cssClass?: string;
  listClass?: string;
  isDefault?: string;
  status?: string;
}

/** 参数配置 sys_config */
export interface SysConfig extends BaseEntity {
  configId?: number;
  configName?: string;
  configKey?: string;
  configValue?: string;
  configType?: string;
}

/** 通知公告 sys_notice */
export interface SysNotice extends BaseEntity {
  noticeId?: number;
  noticeTitle?: string;
  noticeType?: string;
  noticeContent?: string;
  status?: string;
}

/** getRouters 返回的路由节点 */
export interface RouterVo {
  name?: string;
  path?: string;
  hidden?: boolean;
  redirect?: string;
  component?: string | null;
  alwaysShow?: boolean;
  query?: string;
  meta?: RouteMetaVo;
  children?: RouterVo[];
}

export interface RouteMetaVo {
  title?: string;
  icon?: string;
  noCache?: boolean;
  link?: string | null;
}
