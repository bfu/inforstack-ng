import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { CommonApi, UploadResult } from '@api/common';
import { ImageUpload } from './image-upload';

describe('ImageUpload', () => {
  let upload: ReturnType<typeof vi.fn>;
  let message: { error: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };
  let component: ImageUpload;

  beforeEach(() => {
    upload = vi.fn(() =>
      of({
        code: 200,
        msg: 'ok',
        fileName: '/profile/a.png',
        url: 'http://cdn/a.png',
      } as UploadResult),
    );
    message = { error: vi.fn(), warning: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: CommonApi, useValue: { upload } },
        { provide: NzMessageService, useValue: message },
      ],
    });
    const fixture = TestBed.createComponent(ImageUpload);
    component = fixture.componentInstance;
  });

  describe('beforeUpload 校验', () => {
    it('非图片类型拒绝', () => {
      const text = { name: 'a.txt', type: 'text/plain', size: 1 } as NzUploadFile;
      expect(component.beforeUpload(text)).toBe(false);
      expect(message.error).toHaveBeenCalledWith('文件格式不正确，请上传图片');
    });

    it('超过大小上限（默认 5MB）拒绝', () => {
      const big = { name: 'a.png', type: 'image/png', size: 6 * 1024 * 1024 } as NzUploadFile;
      expect(component.beforeUpload(big)).toBe(false);
      expect(message.error).toHaveBeenCalledWith('图片大小不能超过 5MB');
    });

    it('合规图片放行', () => {
      const img = { name: 'a.png', type: 'image/png', size: 1024 } as NzUploadFile;
      expect(component.beforeUpload(img)).toBe(true);
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

    it('业务失败提示错误', () => {
      upload.mockReturnValue(of({ code: 500, msg: '失败', fileName: '', url: '' } as UploadResult));
      const item = makeItem();
      component.customRequest(item);

      expect(message.error).toHaveBeenCalledWith('失败');
      expect(item.onError).toHaveBeenCalled();
    });

    it('网络异常提示重试', () => {
      upload.mockReturnValue(throwError(() => new Error('net')));
      const item = makeItem();
      component.customRequest(item);

      expect(message.error).toHaveBeenCalledWith('上传失败，请重试');
    });
  });

  describe('onChange 状态同步', () => {
    it('上传完成后 url 取响应地址（优先 url 字段）', () => {
      component.onChange({
        file: {} as NzUploadFile,
        fileList: [
          {
            uid: '1',
            name: 'a.png',
            status: 'done',
            response: {
              code: 200,
              msg: 'ok',
              fileName: '/profile/a.png',
              url: 'http://cdn/a.png',
            },
          } as NzUploadFile,
        ],
        type: 'success',
      });

      expect(component.url()).toBe('http://cdn/a.png');
    });

    it('响应无 url 时回退 fileName', () => {
      component.onChange({
        file: {} as NzUploadFile,
        fileList: [
          {
            uid: '1',
            name: 'a.png',
            status: 'done',
            response: { code: 200, msg: 'ok', fileName: '/profile/a.png' },
          } as NzUploadFile,
        ],
        type: 'success',
      });

      expect(component.url()).toBe('/profile/a.png');
    });

    it('移除或空列表清空 url', () => {
      component.onChange({
        file: {} as NzUploadFile,
        fileList: [{ uid: '1', name: 'a.png', status: 'done' } as NzUploadFile],
        type: 'success',
      });

      component.onChange({
        file: {} as NzUploadFile,
        fileList: [],
        type: 'removed',
      });

      expect(component.url()).toBe('');
    });
  });
});
