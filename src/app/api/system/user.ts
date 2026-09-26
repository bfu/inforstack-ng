import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '../../core/request.service';
import { AjaxResult, TableDataInfo, PageQuery, TreeSelectNode } from '../../core/models/result';
import { SysDept, SysPost, SysRole, SysUser } from '../../core/models/system';
import { parseStrEmpty } from '../../core/utils/ruoyi';

/** 用户详情（新增/编辑弹窗的表单数据源） */
export interface UserDetailResult {
  code: number;
  msg: string;
  data?: SysUser;
  posts: SysPost[];
  roles: SysRole[];
  postIds?: number[];
  roleIds?: number[];
}

/** 授权角色页面数据 */
export interface AuthRoleResult {
  code: number;
  msg: string;
  user: SysUser;
  roles: SysRole[];
}

/** 用户接口，对应 ruoyi-vue3/src/api/system/user.js */
@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly request = inject(RequestService);

  listUser(query: PageQuery): Observable<TableDataInfo<SysUser>> {
    return this.request.get<TableDataInfo<SysUser>>('/system/user/list', query);
  }

  /** 查询用户详细；新增时传空字符串，返回岗位与角色备选 */
  getUser(userId?: number | string): Observable<UserDetailResult> {
    return this.request.get<UserDetailResult>(`/system/user/${parseStrEmpty(userId ?? '')}`);
  }

  addUser(data: SysUser): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/system/user', data);
  }

  updateUser(data: SysUser): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/user', data);
  }

  delUser(userId: number | string): Observable<AjaxResult> {
    return this.request.delete<AjaxResult>(`/system/user/${userId}`);
  }

  resetUserPwd(userId: number | string, password: string): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/user/resetPwd', { userId, password });
  }

  changeUserStatus(userId: number, status: string): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/user/changeStatus', { userId, status });
  }

  /** 导入用户数据（multipart/form-data） */
  importData(formData: FormData, updateSupport: boolean): Observable<AjaxResult> {
    formData.append('updateSupport', String(updateSupport));
    return this.request.post<AjaxResult>('/system/user/importData', formData, { timeout: 60000 });
  }

  getUserProfile(): Observable<AjaxResult<SysUser>> {
    return this.request.get<AjaxResult<SysUser>>('/system/user/profile');
  }

  updateUserProfile(data: SysUser): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/user/profile', data);
  }

  updateUserPwd(oldPassword: string, newPassword: string): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/user/profile/updatePwd', { oldPassword, newPassword });
  }

  /** 查询授权角色 */
  getAuthRole(userId: number | string): Observable<AuthRoleResult> {
    return this.request.get<AuthRoleResult>(`/system/user/authRole/${userId}`);
  }

  /** 保存授权角色（后端以 query 参数接收） */
  updateAuthRole(userId: number | string, roleIds: string): Observable<AjaxResult> {
    const query = `?userId=${encodeURIComponent(String(userId))}&roleIds=${encodeURIComponent(roleIds)}`;
    return this.request.put<AjaxResult>(`/system/user/authRole${query}`);
  }

  /** 部门下拉树 */
  deptTreeSelect(): Observable<{ code: number; msg: string; data: TreeSelectNode[] }> {
    return this.request.get<{ code: number; msg: string; data: TreeSelectNode[] }>('/system/user/deptTree');
  }
}
