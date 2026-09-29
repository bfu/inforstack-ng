import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { OnlineApi } from '@api/monitor/online';
import { SysUserOnline } from '@core/models/monitor';
import { UserStore } from '@store/user.store';
import { stubModalService } from '@testing/modal-mock';
import { OnlinePage } from './online';

type Mock = ReturnType<typeof vi.fn>;

describe('OnlinePage 在线用户', () => {
  let api: { listOnline: Mock; forceLogout: Mock };
  let success: Mock;
  let modal: ReturnType<typeof stubModalService>;

  const onlines: SysUserOnline[] = [
    { tokenId: 't1', userName: 'admin', ipaddr: '127.0.0.1', loginTime: 1700000000000 },
    { tokenId: 't2', userName: 'ry', ipaddr: '192.168.1.2' },
  ];

  beforeEach(() => {
    api = {
      listOnline: vi.fn(() => of({ code: 200, msg: '', rows: onlines, total: onlines.length })),
      forceLogout: vi.fn(() => of({ code: 200, msg: '' })),
    };
    success = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: OnlineApi, useValue: api },
        { provide: NzModalService, useValue: {} },
        { provide: NzMessageService, useValue: { success, error: vi.fn(), warning: vi.fn() } },
        {
          provide: UserStore,
          useValue: { hasPermi: vi.fn(() => true), hasRole: vi.fn(() => true) },
        },
      ],
    });
  });

  function create(): OnlinePage {
    const fixture = TestBed.createComponent(OnlinePage);
    modal = stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 首查（不带分页参数）', () => {
    const page = create();

    expect(api.listOnline).toHaveBeenCalledWith({ ipaddr: undefined, userName: undefined });
    expect(page.rows()).toEqual(onlines);
    expect(page.loading()).toBe(false);
  });

  it('resetQuery 重置条件并重新查询', () => {
    const page = create();
    page.searchForm.patchValue({ userName: 'admin' });

    page.resetQuery();

    expect(page.searchForm.getRawValue()).toEqual({ ipaddr: '', userName: '' });
    expect(api.listOnline).toHaveBeenLastCalledWith({ ipaddr: undefined, userName: undefined });
  });

  it('onQueryParams 仅更新分页（前端分页，不重新请求）', () => {
    const page = create();
    api.listOnline.mockClear();

    page.onQueryParams({ pageIndex: 2, pageSize: 20 } as never);

    expect(page.pageNum()).toBe(2);
    expect(page.pageSize()).toBe(20);
    expect(api.listOnline).not.toHaveBeenCalled();
  });

  it('强退单个用户：确认后调 forceLogout 并刷新', () => {
    const page = create();
    api.listOnline.mockClear();

    page.forceLogout(onlines[0]);

    expect(api.forceLogout).toHaveBeenCalledWith('t1');
    expect(success).toHaveBeenCalledWith('强退成功');
    expect(api.listOnline).toHaveBeenCalledTimes(1);
  });

  it('批量强退：逐条调用且只提示一次', () => {
    const page = create();
    page.selection.onItemChecked('t1', true);
    page.selection.onItemChecked('t2', true);

    page.forceLogout();

    expect(api.forceLogout).toHaveBeenCalledTimes(2);
    expect(api.forceLogout).toHaveBeenCalledWith('t1');
    expect(api.forceLogout).toHaveBeenCalledWith('t2');
    expect(success).toHaveBeenCalledTimes(1);
  });

  it('未勾选且未指定行时不弹确认框', () => {
    const page = create();

    page.forceLogout();

    expect(modal.confirm).not.toHaveBeenCalled();
    expect(api.forceLogout).not.toHaveBeenCalled();
  });

  it('取消确认时不发起强退', () => {
    const page = create();
    modal.setMode('cancel');

    page.forceLogout(onlines[1]);

    expect(api.forceLogout).not.toHaveBeenCalled();
  });

  it('formatTime 空值返回空串', () => {
    const page = create();

    expect(page.formatTime()).toBe('');
    expect(typeof page.formatTime(onlines[0].loginTime)).toBe('string');
  });
});
