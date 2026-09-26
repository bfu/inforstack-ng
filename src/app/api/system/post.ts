import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '../../core/request.service';
import { AjaxResult, TableDataInfo, PageQuery } from '../../core/models/result';
import { SysPost } from '../../core/models/system';

/** 岗位接口，对应 ruoyi-vue3/src/api/system/post.js */
@Injectable({ providedIn: 'root' })
export class PostApi {
  private readonly request = inject(RequestService);

  listPost(query: PageQuery): Observable<TableDataInfo<SysPost>> {
    return this.request.get<TableDataInfo<SysPost>>('/system/post/list', query);
  }

  getPost(postId: number | string): Observable<AjaxResult<SysPost>> {
    return this.request.get<AjaxResult<SysPost>>(`/system/post/${postId}`);
  }

  addPost(data: SysPost): Observable<AjaxResult> {
    return this.request.post<AjaxResult>('/system/post', data);
  }

  updatePost(data: SysPost): Observable<AjaxResult> {
    return this.request.put<AjaxResult>('/system/post', data);
  }

  delPost(postId: number | string | number[]): Observable<AjaxResult> {
    const ids = Array.isArray(postId) ? postId.join(',') : postId;
    return this.request.delete<AjaxResult>(`/system/post/${ids}`);
  }
}
