import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NoticeApi } from '@api/system/notice';
import { DownloadService } from '@core/download.service';
import { SysNotice } from '@core/models/system';
import { DictStore } from '@store/dict.store';
import { UserStore } from '@store/user.store';
import { stubModalService } from '@testing/modal-mock';
import { NoticePage } from './notice';

type Mock = ReturnType<typeof vi.fn>;

describe('NoticePage 通知公告', () => {
  let listNotice: Mock;
  let addNotice: Mock;
  let updateNotice: Mock;
  let delNotice: Mock;
  let download: Mock;
  let confirm: Mock;
  let success: Mock;
  let getDict: ReturnType<typeof vi.fn>;
  let loadDict: ReturnType<typeof vi.fn>;

  const notices: SysNotice[] = [
    { noticeId: 1, noticeTitle: '通知一', noticeType: '1', status: '0' },
    { noticeId: 2, noticeTitle: '公告二', noticeType: '2', status: '1' },
  ];

  beforeEach(() => {
    listNotice = vi.fn(() => of({ code: 200, msg: '', rows: notices, total: 2 }));
    addNotice = vi.fn(() => of({ code: 200, msg: '' }));
    updateNotice = vi.fn(() => of({ code: 200, msg: '' }));
    delNotice = vi.fn(() => of({ code: 200, msg: '' }));
    download = vi.fn(() => of(undefined));
    success = vi.fn();
    getDict = vi.fn(() => [{ label: '公告', value: '1', listClass: 'primary' }]);
    loadDict = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: NoticeApi, useValue: { listNotice, addNotice, updateNotice, delNotice } },
        { provide: DownloadService, useValue: { download } },
        { provide: NzModalService, useValue: {} },
        { provide: NzMessageService, useValue: { success, error: vi.fn(), warning: vi.fn() } },
        {
          provide: DictStore,
          useValue: {
            getDict,
            loadDict,
            setDict: vi.fn(),
            removeDict: vi.fn(),
            cleanDict: vi.fn(),
          },
        },
        {
          provide: UserStore,
          useValue: { hasPermi: vi.fn(() => true), hasRole: vi.fn(() => true) },
        },
      ],
    });
  });

  function create(): NoticePage {
    const fixture = TestBed.createComponent(NoticePage);
    confirm = stubModalService(fixture.debugElement).confirm;
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 发起首查', async () => {
    const page = await create();

    expect(listNotice).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      noticeTitle: undefined,
      createBy: undefined,
      noticeType: undefined,
    });
    expect(page.rows()).toEqual(notices);
  });

  it('两个字典类型在未缓存时都会加载', async () => {
    getDict.mockReturnValue(null);
    await create();

    expect(loadDict).toHaveBeenCalledWith('sys_notice_type');
    expect(loadDict).toHaveBeenCalledWith('sys_notice_status');
  });

  it('新增提交后调 addNotice', async () => {
    const page = await create();
    listNotice.mockClear();

    page.openAdd();
    page.form.patchValue({ noticeTitle: '新公告', noticeType: '1' });
    page.submitForm();

    expect(addNotice).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledWith('新增成功');
  });

  it('编辑回填并调 updateNotice', async () => {
    const page = await create();

    page.openEdit(notices[1]);
    expect(page.form.controls.noticeTitle.value).toBe('公告二');
    expect(page.dialogTitle()).toBe('修改公告');

    page.submitForm();
    expect(updateNotice).toHaveBeenCalledWith(
      expect.objectContaining({ noticeId: 2, noticeTitle: '公告二' }),
    );
  });

  it('删除按标题拼接提示', async () => {
    const page = await create();
    listNotice.mockClear();

    page.delete(notices[0]);

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ nzContent: '是否确认删除标题为「通知一」的公告？' }),
    );
    expect(delNotice).toHaveBeenCalledWith([1]);
    expect(success).toHaveBeenCalledWith('删除成功');
  });

  it('导出剥离分页参数', async () => {
    const page = await create();

    page.export();

    expect(download).toHaveBeenCalledWith(
      '/system/notice/export',
      { noticeTitle: undefined, createBy: undefined, noticeType: undefined },
      expect.stringMatching(/^notice_\d{14}\.xlsx$/),
    );
  });
});
