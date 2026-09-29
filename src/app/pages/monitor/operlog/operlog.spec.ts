import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { OperlogApi } from '@api/monitor/operlog';
import { DownloadService } from '@core/download.service';
import { SysOperLog } from '@core/models/monitor';
import { DictStore } from '@store/dict.store';
import { UserStore } from '@store/user.store';
import { stubModalService } from '@testing/modal-mock';
import { OperlogPage } from './operlog';

type Mock = ReturnType<typeof vi.fn>;

describe('OperlogPage 操作日志', () => {
  let api: { listOperlog: Mock; delOperlog: Mock; cleanOperlog: Mock };
  let download: Mock;
  let success: Mock;
  let getDict: Mock;
  let loadDict: Mock;
  let modal: ReturnType<typeof stubModalService>;

  const logs: SysOperLog[] = [
    { operId: 1, title: '用户管理', operName: 'admin', businessType: 1, status: 0 },
    { operId: 2, title: '角色管理', operName: 'ry', businessType: 2, status: 1 },
  ];

  beforeEach(() => {
    api = {
      listOperlog: vi.fn(() => of({ code: 200, msg: '', rows: logs, total: logs.length })),
      delOperlog: vi.fn(() => of({ code: 200, msg: '' })),
      cleanOperlog: vi.fn(() => of({ code: 200, msg: '' })),
    };
    download = vi.fn(() => of(undefined));
    success = vi.fn();
    getDict = vi.fn(() => [{ label: '新增', value: '1', listClass: 'primary' }]);
    loadDict = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: OperlogApi, useValue: api },
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

  function create(): OperlogPage {
    const fixture = TestBed.createComponent(OperlogPage);
    modal = stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 首查并加载两个字典', () => {
    getDict.mockReturnValue(null);
    const page = create();

    expect(loadDict).toHaveBeenCalledWith('sys_oper_type');
    expect(loadDict).toHaveBeenCalledWith('sys_common_status');
    expect(api.listOperlog).toHaveBeenCalledWith(
      expect.objectContaining({ pageNum: 1, pageSize: 10, title: undefined }),
    );
    expect(page.rows()).toEqual(logs);
  });

  it('openDetail 记录当前行并打开详情', () => {
    const page = create();

    page.openDetail(logs[1]);

    expect(page.detailRow()).toEqual(logs[1]);
    expect(page.detailVisible()).toBe(true);
  });

  it('formatJson：空值/合法 JSON/非法 JSON', () => {
    const page = create();

    expect(page.formatJson()).toBe('（无数据）');
    expect(page.formatJson('{"a":1}')).toContain('\n');
    expect(page.formatJson('not-json')).toBe('not-json');
  });

  it('删除：确认后调 delOperlog 并刷新', () => {
    const page = create();
    api.listOperlog.mockClear();

    page.delete(logs[0]);

    expect(api.delOperlog).toHaveBeenCalledWith([1]);
    expect(success).toHaveBeenCalledWith('删除成功');
    expect(api.listOperlog).toHaveBeenCalledTimes(1);
  });

  it('批量删除使用勾选行', () => {
    const page = create();
    page.selection.onItemChecked(1, true);
    page.selection.onItemChecked(2, true);

    page.delete();

    expect(api.delOperlog).toHaveBeenCalledWith([1, 2]);
  });

  it('清空：确认后调 cleanOperlog', () => {
    const page = create();

    page.clean();

    expect(api.cleanOperlog).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledWith('清空成功');
  });

  it('取消删除确认时不调接口', () => {
    const page = create();
    modal.setMode('cancel');

    page.delete(logs[0]);

    expect(api.delOperlog).not.toHaveBeenCalled();
  });

  it('导出剥离分页参数', () => {
    const page = create();

    page.export();

    expect(download).toHaveBeenCalledWith(
      '/monitor/operlog/export',
      expect.objectContaining({ title: undefined }),
      expect.stringMatching(/^operlog_\d{14}\.xlsx$/),
    );
  });
});
