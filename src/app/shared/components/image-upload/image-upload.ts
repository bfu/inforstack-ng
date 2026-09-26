import { Component, computed, inject, input, model, signal } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadChangeParam, NzUploadFile, NzUploadModule, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { CommonApi, UploadResult } from '@api/common';

/**
 * 图片/头像上传组件（单张，卡片式预览）
 * 对应 ruoyi-vue3/src/components/ImageUpload
 *
 * 用法：<app-image-upload [(url)]="form.avatar" />
 */
@Component({
  selector: 'app-image-upload',
  imports: [NzIconModule, NzUploadModule],
  templateUrl: './image-upload.html',
  styleUrl: './image-upload.less',
})
export class ImageUpload {
  private readonly api = inject(CommonApi);
  private readonly message = inject(NzMessageService);

  /** 绑定值：后端返回的图片地址 */
  readonly url = model<string>('');

  readonly fileSize = input<number>(5);

  private readonly fileList = signal<NzUploadFile[]>([]);

  readonly previewUrl = computed(() => this.url());

  constructor() {
    const initial = this.url();
    if (initial) {
      this.fileList.set([{ uid: initial, name: initial.split('/').pop() ?? initial, status: 'done', url: initial }]);
    }
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    const isImage = file.type?.startsWith('image/');
    if (!isImage) {
      this.message.error('文件格式不正确，请上传图片');
      return false;
    }
    const limitSize = this.fileSize();
    if ((file.size ?? 0) > limitSize * 1024 * 1024) {
      this.message.error(`图片大小不能超过 ${limitSize}MB`);
      return false;
    }
    return true;
  };

  customRequest = (item: NzUploadXHRArgs) => {
    const formData = new FormData();
    formData.append('file', item.file as unknown as File);
    return this.api.upload(formData).subscribe({
      next: (res: UploadResult) => {
        if (res.code === 200) {
          item.onSuccess?.(res, item.file, undefined);
        } else {
          this.message.error(res.msg || '上传失败');
          item.onError?.(new Error(res.msg), item.file);
        }
      },
      error: () => {
        this.message.error('上传失败，请重试');
        item.onError?.(new Error('上传失败'), item.file);
      },
    });
  };

  onChange(event: NzUploadChangeParam): void {
    const list = event.fileList ?? [];
    if (event.type === 'removed' || !list.length) {
      this.fileList.set([]);
      this.url.set('');
      return;
    }
    const latest = list[list.length - 1];
    if (latest.status === 'done') {
      const result = latest.response as UploadResult | undefined;
      const value = result?.url ?? result?.fileName ?? '';
      this.fileList.set([{ ...latest, url: value }]);
      this.url.set(value);
    }
  }
}
