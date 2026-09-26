import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '../../core/request.service';
import { AjaxResult, PageQuery, TreeSelectNode } from '../../core/models/result';
import { SysMenu } from '../../core/models/system';

/** 菜单树（含已勾选节点）返回 */
export interface MenuTreeResult {
  code: number;
  msg: string;
  menus: TreeSelectNode[];
  checkedKeys: number[];
}

/** 菜单接口，对应 ruoyi-vue3/src/api/system/menu.js */
@Injectable({ providedIn: 'root' })
export class SysMenuApi {
  private readonly request = inject(RequestService);

  /** 菜单列表（无分页，后端直接返回 data 平铺列表由前端构建树） */
  listMenu(query?: Partial<PageQuery>): Observable<AjaxResult<SysMenu[]>> {
    return this.request.get<AjaxResult<SysMenu[]>>('/system/menu/list', query);
  }

  getMenu(menuId: number | string): Observable<AjaxResult<SysMenu>> {
    return this.request.get<AjaxResult<SysMenu>>(`/system/menu/${menuId}`);
  }

  /** 菜单下拉树 */
  treeselect(): Observable<{ code: number; msg: string; data: TreeSelectNode[] }> {
    return this.request.get<{ code: number; msg: string; data: TreeSelectNode[] }>('/system/menu/treeselect');
  }

  /** 角色对应的菜单树 */
  roleMenuTreeselect(roleId: number | string): Observable<MenuTreeResult> {
    return this.request.get<MenuTreeResult>(`/system/menu/roleMenuTreeselect/${roleId}`);
  }

  addMenu(data: SysMenu): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/system/menu', data);
  }

  updateMenu(data: SysMenu): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/menu', data);
  }

  delMenu(menuId: number | string): Observable<AjaxResult> {
    return this.request.delete<AjaxResult>(`/system/menu/${menuId}`);
  }
}
