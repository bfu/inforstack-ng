import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { CommonApi, UploadResult } from '@api/common';
import { FileUpload } from './file-upload';

describe('FileUpload', () => {
  let upload: ReturnType<typeof vi.fn>;
  let message: { error: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };
  let component: FileUpload;

  beforeEach(() => {
    upload = vi.fn(() =>
      of({ code: 200, msg: 'ok', fileName: '/profile/a.png', url: '' } as UploadResult),
    );
    message = { error: vi.fn(), warning: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: CommonApi, useValue: { upload } },
        { provide: NzMessageService, useValue: message },
      ],
    });
    const fixture = TestBed.createComponent(FileUpload);
    component = fixture.componentInstance;
  });

  describe('beforeUpload 校验', () => {
    it('超过大小上限拒绝并提示', () => {
      const big = { name: 'a', size: 11 * 1024 * 1024 } as NzUploadFile;
      expect(component.beforeUpload(big)).toBe(false);
      expect(message.error).toHaveBeenCalledWith('文件大小不能超过 10MB');
    });

    it('大小合规放行', () => {
      const ok = { name: 'a', size: 1024 } as NzUploadFile;
      expect(component.beforeUpload(ok)).toBe(true);
    });

    it('单文件模式下已有文件时拒绝', () => {
      component.onChange({
        file: {} as NzUploadFile,
        fileList: [{ uid: '1', name: 'a', status: 'done' }],
        type: 'success',
      });

      const next = { name: 'b', size: 1 } as NzUploadFile;
      expect(component.beforeUpload(next)).toBe(false);
      expect(message.warning).toHaveBeenCalledWith('仅支持上传单个文件，请先移除已上传文件');
    });
  });

  describe('customRequest 上传', () => {
    function makeItem(): NzUploadXHRArgs {
      return {
        file: { name: 'a.png' } as unknown as File,
        onSuccess: vi.fn(),
        onError: vi.fn(),
      } as unknown as NzUploadXHRArgs;
    }

    it('成功回调 onSuccess', () => {
      const item = makeItem();
      component.customRequest(item);

      expect(item.onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ code: 200 }),
        item.file,
        undefined,
      );
    });

    it('业务失败提示错误并回调 onError', () => {
      upload.mockReturnValue(
        of({ code: 500, msg: '后端失败', fileName: '', url: '' } as UploadResult),
      );
      const item = makeItem();
      component.customRequest(item);

      expect(message.error).toHaveBeenCalledWith('后端失败');
      expect(item.onError).toHaveBeenCalled();
    });

    it('网络异常提示重试', () => {
      upload.mockReturnValue(throwError(() => new Error('net')));
      const item = makeItem();
      component.customRequest(item);

      expect(message.error).toHaveBeenCalledWith('上传失败，请重试');
      expect(item.onError).toHaveBeenCalled();
    });
  });

  describe('onChange 状态同步', () => {
    it('done 文件映射为保存名', () => {
      component.onChange({
        file: {} as NzUploadFile,
        fileList: [
          {
            uid: '1',
            name: 'a.png',
            status: 'done',
            response: { code: 200, msg: 'ok', fileName: '/profile/a.png', url: '' },
          } as NzUploadFile,
          {
            uid: '2',
            name: 'b.png',
            status: 'uploading',
          } as NzUploadFile,
        ],
        type: 'success',
      });

      expect(component.urls()).toBe('/profile/a.png');
    });

    it('无 done 文件时清空 urls', () => {
      component.onChange({
        file: {} as NzUploadFile,
        fileList: [{ uid: '1', name: 'a', status: 'removed' } as NzUploadFile],
        type: 'removed',
      });

      expect(component.urls()).toBe('');
    });
  });
});
