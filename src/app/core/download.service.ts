import { Injectable, inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Observable, catchError, finalize, switchMap, throwError } from 'rxjs';
import { RequestService } from './request.service';
import { resolveErrorMessage } from './utils/error-code';
import { blobValidate } from './utils/ruoyi';

/**
 * 通用下载服务（零第三方依赖，用 Blob + createObjectURL 替代 file-saver）
 * 对应 ruoyi-vue3/src/plugins/download.js 与 src/utils/request.js#download
 */
@Injectable({ providedIn: 'root' })
export class DownloadService {
  private readonly request = inject(RequestService);
  private readonly message = inject(NzMessageService);

  /** 通用下载：POST + 表单参数，用于各模块导出 */
  download(url: string, params: Record<string, unknown>, filename: string): Observable<void> {
    const loadingId = this.message.loading('正在下载数据，请稍候', { nzDuration: 0 }).messageId;
    return this.request.postBlob(url, params, { timeout: 60000 }).pipe(
      switchMap(async (blob) => {
        if (blobValidate(blob)) {
          this.saveAs(blob, filename);
        } else {
          await this.printErrMsg(blob);
        }
      }),
      finalize(() => this.message.remove(loadingId)),
      catchError((err) => {
        this.message.error('下载文件出现错误，请联系管理员！');
        return throwError(() => err);
      }),
    );
  }

  /** 按文件名下载（/common/download），文件名取自 download-filename 响应头 */
  name(fileName: string, isDelete = true): void {
    const loadingId = this.message.loading('正在下载数据，请稍候', { nzDuration: 0 }).messageId;
    this.request
      .getBlobResponse('/common/download', {
        fileName: encodeURIComponent(fileName),
        delete: isDelete,
      })
      .pipe(finalize(() => this.message.remove(loadingId)))
      .subscribe({
        next: (res) => {
          const blob = res.body;
          if (blob && blobValidate(blob)) {
            this.saveAs(blob, decodeURIComponent(res.headers.get('download-filename') ?? fileName));
          } else if (blob) {
            void this.printErrMsg(blob);
          }
        },
      });
  }

  /** 下载资源（/common/download/resource） */
  resource(resource: string): void {
    const loadingId = this.message.loading('正在下载数据，请稍候', { nzDuration: 0 }).messageId;
    this.request
      .getBlobResponse('/common/download/resource', { resource: encodeURIComponent(resource) })
      .pipe(finalize(() => this.message.remove(loadingId)))
      .subscribe({
        next: (res) => {
          const blob = res.body;
          if (blob && blobValidate(blob)) {
            this.saveAs(blob, decodeURIComponent(res.headers.get('download-filename') ?? resource));
          } else if (blob) {
            void this.printErrMsg(blob);
          }
        },
      });
  }

  /** 下载 zip（代码生成等场景） */
  zip(url: string, name: string): void {
    const loadingId = this.message.loading('正在下载数据，请稍候', { nzDuration: 0 }).messageId;
    this.request
      .getBlob(url, undefined, { timeout: 60000 })
      .pipe(finalize(() => this.message.remove(loadingId)))
      .subscribe({
        next: (blob) => {
          if (blobValidate(blob)) {
            this.saveAs(new Blob([blob], { type: 'application/zip' }), name);
          } else {
            void this.printErrMsg(blob);
          }
        },
      });
  }

  /** 保存文件到本地 */
  saveAs(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // 同步回收会让部分浏览器（Firefox / Safari）取消尚未开始的下载
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  /** 解析错误流中的提示信息 */
  private async printErrMsg(data: Blob): Promise<void> {
    const text = await data.text();
    try {
      const rspObj = JSON.parse(text) as { code: number; msg: string };
      this.message.error(resolveErrorMessage(rspObj.code, rspObj.msg));
    } catch {
      // 错误流不是 JSON（如网关返回的 HTML 错误页）时兜底
      this.message.error('下载文件出现错误，请联系管理员！');
    }
  }
}
