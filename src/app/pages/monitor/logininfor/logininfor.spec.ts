import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { LogininforApi } from '@api/monitor/logininfor';
import { DownloadService } from '@core/download.service';
import { SysLogininfor } from '@core/models/monitor';
import { DictStore } from '@store/dict.store';
import { UserStore } from '@store/user.store';
import { stubModalService } from '@testing/modal-mock';
import { LogininforPage } from './logininfor';

type Mock = ReturnType<typeof vi.fn>;

describe('LogininforPage 登录日志', () => {
  let api: {
    listLogininfor: Mock;
    delLogininfor: Mock;
    cleanLogininfor: Mock;
    unlockLogininfor: Mock;
  };
  let download: Mock;
  let success: Mock;
  let getDict: Mock;
  let loadDict: Mock;
  let modal: ReturnType<typeof stubModalService>;

  const infos: SysLogininfor[] = [
    { infoId: 1, userName: 'admin', status: '0', ipaddr: '127.0.0.1' },
    { infoId: 2, userName: 'ry', status: '1', ipaddr: '192.168.1.2' },
  ];

  beforeEach(() => {
    api = {
      listLogininfor: vi.fn(() => of({ code: 200, msg: '', rows: infos, total: infos.length })),
      delLogininfor: vi.fn(() => of({ code: 200, msg: '' })),
      cleanLogininfor: vi.fn(() => of({ code: 200, msg: '' })),
      unlockLogininfor: vi.fn(() => of({ code: 200, msg: '' })),
    };
    download = vi.fn(() => of(undefined));
    success = vi.fn();
    getDict = vi.fn(() => [{ label: '成功', value: '0', listClass: 'success' }]);
    loadDict = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: LogininforApi, useValue: api },
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

  function create(): LogininforPage {
    const fixture = TestBed.createComponent(LogininforPage);
    modal = stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 首查并加载字典', () => {
    getDict.mockReturnValue(null);
    const page = create();

    expect(loadDict).toHaveBeenCalledWith('sys_common_status');
    expect(api.listLogininfor).toHaveBeenCalledWith(
      expect.objectContaining({ pageNum: 1, pageSize: 10, ipaddr: undefined, status: undefined }),
    );
    expect(page.rows()).toEqual(infos);
  });

  it('日期范围补齐当天起止时间', () => {
    const page = create();
    page.dateRange.set([new Date(2024, 0, 2), new Date(2024, 0, 31)]);

    page.getList();

    const query = api.listLogininfor.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    const params = query['params'] as Record<string, unknown>;
    expect(params['beginTime']).toBe('2024-01-02 00:00:00');
    expect(params['endTime']).toBe('2024-01-31 23:59:59');
  });

  it('resetQuery 重置条件与日期', () => {
    const page = create();
    page.searchForm.patchValue({ userName: 'admin' });
    page.dateRange.set([new Date(), new Date()]);

    page.resetQuery();

    expect(page.searchForm.getRawValue()).toEqual({ ipaddr: '', userName: '', status: '' });
    expect(page.dateRange()).toEqual([]);
  });

  it('删除：确认后调 delLogininfor 并刷新', () => {
    const page = create();
    api.listLogininfor.mockClear();

    page.delete(infos[0]);

    expect(api.delLogininfor).toHaveBeenCalledWith([1]);
    expect(success).toHaveBeenCalledWith('删除成功');
    expect(api.listLogininfor).toHaveBeenCalledTimes(1);
  });

  it('清空：确认后调 cleanLogininfor', () => {
    const page = create();

    page.clean();

    expect(api.cleanLogininfor).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledWith('清空成功');
  });

  it('解锁：未选中用户时不弹窗', () => {
    const page = create();

    page.unlock();

    expect(modal.confirm).not.toHaveBeenCalled();
    expect(api.unlockLogininfor).not.toHaveBeenCalled();
  });

  it('解锁：选中后按用户名解锁', () => {
    const page = create();
    page.selection.onItemChecked(2, true);

    page.unlock();

    expect(api.unlockLogininfor).toHaveBeenCalledWith('ry');
    expect(success).toHaveBeenCalledWith('用户 ry 解锁成功');
  });

  it('导出剥离分页参数', () => {
    const page = create();

    page.export();

    expect(download).toHaveBeenCalledWith(
      '/monitor/logininfor/export',
      expect.objectContaining({ ipaddr: undefined, userName: undefined, status: undefined }),
      expect.stringMatching(/^logininfor_\d{14}\.xlsx$/),
    );
  });
});
