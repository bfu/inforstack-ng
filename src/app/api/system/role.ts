import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '../../core/request.service';
import { AjaxResult, TableDataInfo, PageQuery, TreeSelectNode } from '../../core/models/result';
import { SysRole, SysUser } from '../../core/models/system';

/** 角色菜单树返回 */
export interface RoleMenuTreeResult {
  code: number;
  msg: string;
  menus: TreeSelectNode[];
  checkedKeys: number[];
}

/** 角色部门树返回 */
export interface RoleDeptTreeResult {
  code: number;
  msg: string;
  depts: TreeSelectNode[];
  checkedKeys: number[];
}

/** 角色接口，对应 ruoyi-vue3/src/api/system/role.js */
@Injectable({ providedIn: 'root' })
export class RoleApi {
  private readonly request = inject(RequestService);

  listRole(query: PageQuery): Observable<TableDataInfo<SysRole>> {
    return this.request.get<TableDataInfo<SysRole>>('/system/role/list', query);
  }

  getRole(roleId: number | string): Observable<AjaxResult<SysRole>> {
    return this.request.get<AjaxResult<SysRole>>(`/system/role/${roleId}`);
  }

  addRole(data: SysRole): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/system/role', data);
  }

  updateRole(data: SysRole): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/role', data);
  }

  /** 修改角色数据权限 */
  dataScope(roleId: number, dataScope: string, deptIds: number[]): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/role/dataScope', { roleId, dataScope, deptIds });
  }

  changeStatus(roleId: number, status: string): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/role/changeStatus', { roleId, status });
  }

  delRole(roleId: number | string | number[]): Observable<AjaxResult> {
    const ids = Array.isArray(roleId) ? roleId.join(',') : roleId;
    return this.request.delete<AjaxResult>(`/system/role/${ids}`);
  }

  /** 角色对应的部门树 */
  deptTree(roleId: number | string): Observable<RoleDeptTreeResult> {
    return this.request.get<RoleDeptTreeResult>(`/system/role/deptTree/${roleId}`);
  }

  /** 已分配用户列表 */
  allocatedList(query: PageQuery): Observable<TableDataInfo<SysUser>> {
    return this.request.get<TableDataInfo<SysUser>>('/system/role/authUser/allocatedList', query);
  }

  /** 未分配用户列表 */
  unallocatedList(query: PageQuery): Observable<TableDataInfo<SysUser>> {
    return this.request.get<TableDataInfo<SysUser>>('/system/role/authUser/unallocatedList', query);
  }

  /** 取消单个用户授权 */
  authUserCancel(userId: number, roleId: number): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/role/authUser/cancel', { userId, roleId });
  }

  /** 批量取消授权 */
  authUserCancelAll(roleId: number, userIds: string): Observable<AjaxResult> {
    const query = `?roleId=${encodeURIComponent(roleId)}&userIds=${encodeURIComponent(userIds)}`;
    return this.request.put<AjaxResult>(`/system/role/authUser/cancelAll${query}`);
  }

  /** 批量选择用户授权 */
  authUserSelectAll(roleId: number, userIds: string): Observable<AjaxResult> {
    const query = `?roleId=${encodeURIComponent(roleId)}&userIds=${encodeURIComponent(userIds)}`;
    return this.request.put<AjaxResult>(`/system/role/authUser/selectAll${query}`);
  }
}
