import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '@core/request.service';
import { AjaxResult, PageQuery, TreeSelectNode } from '@core/models/result';
import { SysDept } from '@core/models/system';

/** 部门接口，对应 ruoyi-vue3/src/api/system/dept.js */
@Injectable({ providedIn: 'root' })
export class DeptApi {
  private readonly request = inject(RequestService);

  /** 部门列表（无分页，后端直接返回 data 平铺列表由前端构建树） */
  listDept(query?: Partial<PageQuery>): Observable<AjaxResult<SysDept[]>> {
    return this.request.get<AjaxResult<SysDept[]>>('/system/dept/list', query);
  }

  getDept(deptId: number | string): Observable<AjaxResult<SysDept>> {
    return this.request.get<AjaxResult<SysDept>>(`/system/dept/${deptId}`);
  }

  /**
   * 部门下拉树数据
   * 后端未提供 /system/dept/treeselect，这里与 ruoyi-vue3 保持一致：
   * 用列表接口取平铺数据（编辑时排除自身及下级），由前端构建树。
   */
  treeselect(excludeDeptId?: number | string): Observable<AjaxResult<SysDept[]>> {
    const url =
      excludeDeptId === undefined || excludeDeptId === null
        ? '/system/dept/list'
        : `/system/dept/list/exclude/${excludeDeptId}`;
    return this.request.get<AjaxResult<SysDept[]>>(url);
  }

  /** 角色对应的部门树 */
  roleDeptTreeselect(roleId: number | string): Observable<{ code: number; msg: string; depts: TreeSelectNode[]; checkedKeys: number[] }> {
    return this.request.get<{ code: number; msg: string; depts: TreeSelectNode[]; checkedKeys: number[] }>(
      `/system/dept/roleDeptTreeselect/${roleId}`,
    );
  }

  addDept(data: SysDept): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/system/dept', data);
  }

  updateDept(data: SysDept): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/dept', data);
  }

  delDept(deptId: number | string): Observable<AjaxResult> {
    return this.request.delete<AjaxResult>(`/system/dept/${deptId}`);
  }
}
