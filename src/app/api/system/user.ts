import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '@core/request.service';
import { AjaxResult, TableDataInfo, PageQuery, TreeSelectNode } from '@core/models/result';
import { SysPost, SysRole, SysUser } from '@core/models/system';
import { parseStrEmpty } from '@core/utils/ruoyi';

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

/** 个人信息结果（后端除 data 外另带角色/岗位分组） */
export interface ProfileResult extends AjaxResult<SysUser> {
  roleGroup?: string;
  postGroup?: string;
}

/** 头像上传结果（后端返回字段为 imgUrl） */
export interface AvatarResult extends AjaxResult {
  imgUrl?: string;
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

  getUserProfile(): Observable<ProfileResult> {
    return this.request.get<ProfileResult>('/system/user/profile');
  }

  updateUserProfile(data: SysUser): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/user/profile', data);
  }

  updateUserPwd(oldPassword: string, newPassword: string): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/user/profile/updatePwd', {
      oldPassword,
      newPassword,
    });
  }

  /** 上传头像（后端接收字段名为 avatarfile，会同时更新 sys_user.avatar 并删除旧文件） */
  uploadAvatar(file: File): Observable<AvatarResult> {
    const formData = new FormData();
    formData.append('avatarfile', file);
    return this.request.post<AvatarResult>('/system/user/profile/avatar', formData, {
      timeout: 60000,
    });
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
    return this.request.get<{ code: number; msg: string; data: TreeSelectNode[] }>(
      '/system/user/deptTree',
    );
  }
}
