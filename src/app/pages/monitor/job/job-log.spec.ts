import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { JobApi } from '@api/monitor/job';
import { JobLogApi } from '@api/monitor/job-log';
import { DownloadService } from '@core/download.service';
import { SysJobLog } from '@core/models/monitor';
import { DictStore } from '@store/dict.store';
import { UserStore } from '@store/user.store';
import { stubModalService } from '@testing/modal-mock';
import { JobLogPage } from './job-log';

type Mock = ReturnType<typeof vi.fn>;

describe('JobLogPage 调度日志', () => {
  let api: { listJobLog: Mock; delJobLog: Mock; cleanJobLog: Mock };
  let getJob: Mock;
  let download: Mock;
  let navigate: Mock;
  let success: Mock;
  let params: Record<string, string>;
  let modal: ReturnType<typeof stubModalService>;

  const logs: SysJobLog[] = [
    { jobLogId: 1, jobName: '系统默认', status: '0' },
    { jobLogId: 2, jobName: '系统默认', status: '1' },
  ];

  beforeEach(() => {
    api = {
      listJobLog: vi.fn(() => of({ code: 200, msg: '', rows: logs, total: logs.length })),
      delJobLog: vi.fn(() => of({ code: 200, msg: '' })),
      cleanJobLog: vi.fn(() => of({ code: 200, msg: '' })),
    };
    getJob = vi.fn(() => of({ code: 200, msg: '', data: { jobId: 5, jobName: '系统默认' } }));
    download = vi.fn(() => of(undefined));
    navigate = vi.fn();
    success = vi.fn();
    params = { jobId: '5' };
    TestBed.configureTestingModule({
      providers: [
        { provide: JobLogApi, useValue: api },
        { provide: JobApi, useValue: { getJob } },
        { provide: DownloadService, useValue: { download } },
        { provide: NzModalService, useValue: {} },
        { provide: NzMessageService, useValue: { success, error: vi.fn(), warning: vi.fn() } },
        { provide: Router, useValue: { navigate } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get paramMap() {
                return convertToParamMap(params);
              },
            },
          },
        },
        {
          provide: DictStore,
          useValue: {
            getDict: vi.fn(() => []),
            loadDict: vi.fn(() => of([])),
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

  function create(): JobLogPage {
    const fixture = TestBed.createComponent(JobLogPage);
    modal = stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('带 jobId 时先拉任务并回填搜索条件', () => {
    const page = create();

    expect(getJob).toHaveBeenCalledWith(5);
    expect(page.searchForm.controls.jobName.value).toBe('系统默认');
    expect(api.listJobLog).toHaveBeenCalledTimes(1);
  });

  it('无 jobId 时不拉任务，直接首查', () => {
    params = {};
    const page = create();

    expect(getJob).not.toHaveBeenCalled();
    expect(page.rows()).toEqual(logs);
  });

  it('拉任务失败仍继续首查', () => {
    getJob.mockReturnValue(throwError(() => new Error('boom')));
    const page = create();

    expect(api.listJobLog).toHaveBeenCalledTimes(1);
    expect(page.rows()).toEqual(logs);
  });

  it('openDetail 记录当前行并打开详情', () => {
    const page = create();

    page.openDetail(logs[0]);

    expect(page.detailRow()).toEqual(logs[0]);
    expect(page.detailVisible()).toBe(true);
  });

  it('删除勾选日志：确认后调 delJobLog 并刷新', () => {
    const page = create();
    api.listJobLog.mockClear();

    page.selection.onItemChecked(1, true);
    page.delete();

    expect(api.delJobLog).toHaveBeenCalledWith([1]);
    expect(success).toHaveBeenCalledWith('删除成功');
    expect(api.listJobLog).toHaveBeenCalledTimes(1);
  });

  it('未勾选时删除不弹确认框', () => {
    const page = create();

    page.delete();

    expect(modal.confirm).not.toHaveBeenCalled();
    expect(api.delJobLog).not.toHaveBeenCalled();
  });

  it('清空：确认后调 cleanJobLog', () => {
    const page = create();

    page.clean();

    expect(api.cleanJobLog).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledWith('清空成功');
  });

  it('导出剥离分页参数', () => {
    const page = create();

    page.export();

    expect(download).toHaveBeenCalledWith(
      '/monitor/jobLog/export',
      expect.objectContaining({ jobName: '系统默认' }),
      expect.stringMatching(/^job_log_\d{14}\.xlsx$/),
    );
  });

  it('close 返回任务列表', () => {
    const page = create();

    page.close();

    expect(navigate).toHaveBeenCalledWith(['/monitor/job']);
  });
});
