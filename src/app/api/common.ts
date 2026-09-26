import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestService } from '@core/request.service';

/** 单文件上传结果 */
export interface UploadResult {
  code: number;
  msg: string;
  /** 文件访问地址（完整 URL） */
  url?: string;
  /** 文件名称（保存名） */
  fileName?: string;
  /** 原始文件名 */
  originalFilename?: string;
}

/** 多文件上传结果 */
export interface MultiUploadResult {
  code: number;
  msg: string;
  urls?: string[];
  fileNames?: string[];
  newFileNames?: string[];
  originalFilenames?: string[];
}

/** 通用上传下载接口，对应 ruoyi-vue3/src/api/common.js */
@Injectable({ providedIn: 'root' })
export class CommonApi {
  private readonly request = inject(RequestService);

  /** 单文件上传 */
  upload(formData: FormData): Observable<UploadResult> {
    return this.request.post<UploadResult>('/common/upload', formData, { timeout: 60000 });
  }

  /** 多文件上传 */
  uploads(formData: FormData): Observable<MultiUploadResult> {
    return this.request.post<MultiUploadResult>('/common/uploads', formData, { timeout: 60000 });
  }
}
