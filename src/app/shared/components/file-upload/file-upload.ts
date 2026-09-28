import {
  Component,
  computed,
  inject,
  input,
  model,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import {
  NzUploadChangeParam,
  NzUploadFile,
  NzUploadModule,
  NzUploadXHRArgs,
} from 'ng-zorro-antd/upload';
import { CommonApi, UploadResult } from '@api/common';

/**
 * 通用文件上传组件
 * 对应 ruoyi-vue3/src/components/FileUpload
 *
 * 用法：<app-file-upload [(urls)]="form.fileUrls" />
 * 绑定值为后端保存名，多个以逗号分隔
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-file-upload',
  imports: [NzButtonModule, NzIconModule, NzUploadModule],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.less',
})
export class FileUpload {
  private readonly api = inject(CommonApi);
  private readonly message = inject(NzMessageService);

  /** 绑定值：多个保存名以逗号分隔 */
  readonly urls = model<string>('');

  readonly multiple = input(false);
  readonly accept = input('');
  /** 数量上限 */
  readonly limit = input<number>(5);
  /** 单文件大小上限（MB） */
  readonly fileSize = input<number>(10);

  /** 已上传文件列表 */
  private readonly fileList = signal<NzUploadFile[]>([]);

  readonly uploadDisabled = computed(() => this.fileList().length >= this.limit());

  constructor() {
    const initial = this.urls();
    if (initial) {
      this.fileList.set(
        initial
          .split(',')
          .filter(Boolean)
          .map((name) => ({
            uid: name,
            name: name.split('/').pop() ?? name,
            status: 'done' as const,
          })),
      );
    }
  }

  beforeUpload = (file: NzUploadFile): boolean => {
    const limitSize = this.fileSize();
    if (limitSize > 0 && (file.size ?? 0) > limitSize * 1024 * 1024) {
      this.message.error(`文件大小不能超过 ${limitSize}MB`);
      return false;
    }
    if (!this.multiple() && this.fileList().length >= 1) {
      this.message.warning('仅支持上传单个文件，请先移除已上传文件');
      return false;
    }
    if (this.fileList().length >= this.limit()) {
      this.message.warning(`最多上传 ${this.limit()} 个文件`);
      return false;
    }
    return true;
  };

  customRequest = (item: NzUploadXHRArgs) => {
    const formData = new FormData();
    formData.append('file', item.file as unknown as File);
    return this.api.upload(formData).subscribe({
      next: (res: UploadResult) => {
        if (res.code === 200 && res.fileName) {
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
    const names = list
      .filter((item) => item.status === 'done')
      .map((item) => (item.response as UploadResult | undefined)?.fileName ?? item.uid)
      .filter(Boolean);
    this.fileList.set(list.filter((item) => item.status === 'done'));
    this.urls.set(names.join(','));
  }
}
