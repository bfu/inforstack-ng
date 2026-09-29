import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { JobApi } from '@api/monitor/job';
import { DownloadService } from '@core/download.service';
import { SysJob } from '@core/models/monitor';
import { DictStore } from '@store/dict.store';
import { UserStore } from '@store/user.store';
import { stubModalService } from '@testing/modal-mock';
import { JobPage } from './job';

type Mock = ReturnType<typeof vi.fn>;

describe('JobPage 定时任务', () => {
  let api: {
    listJob: Mock;
    addJob: Mock;
    updateJob: Mock;
    delJob: Mock;
    changeJobStatus: Mock;
    runJob: Mock;
  };
  let download: Mock;
  let navigate: Mock;
  let success: Mock;
  let getDict: Mock;
  let loadDict: Mock;
  let modal: ReturnType<typeof stubModalService>;

  const jobs: SysJob[] = [
    {
      jobId: 1,
      jobName: '系统默认',
      jobGroup: 'DEFAULT',
      invokeTarget: 'ryTask.ryNoParams',
      cronExpression: '0/10 * * * * ?',
      status: '0',
    },
    {
      jobId: 2,
      jobName: '清理日志',
      jobGroup: 'SYSTEM',
      invokeTarget: 'ryTask.clear',
      cronExpression: '0 0 1 * * ?',
      status: '1',
    },
  ];

  beforeEach(() => {
    api = {
      listJob: vi.fn(() => of({ code: 200, msg: '', rows: jobs, total: jobs.length })),
      addJob: vi.fn(() => of({ code: 200, msg: '' })),
      updateJob: vi.fn(() => of({ code: 200, msg: '' })),
      delJob: vi.fn(() => of({ code: 200, msg: '' })),
      changeJobStatus: vi.fn(() => of({ code: 200, msg: '' })),
      runJob: vi.fn(() => of({ code: 200, msg: '' })),
    };
    download = vi.fn(() => of(undefined));
    navigate = vi.fn();
    success = vi.fn();
    getDict = vi.fn(() => []);
    loadDict = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: JobApi, useValue: api },
        { provide: DownloadService, useValue: { download } },
        { provide: NzModalService, useValue: {} },
        { provide: NzMessageService, useValue: { success, error: vi.fn(), warning: vi.fn() } },
        { provide: Router, useValue: { navigate } },
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

  function create(): JobPage {
    const fixture = TestBed.createComponent(JobPage);
    modal = stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 首查并加载两个字典', () => {
    getDict.mockReturnValue(null);
    const page = create();

    expect(loadDict).toHaveBeenCalledWith('sys_job_group');
    expect(loadDict).toHaveBeenCalledWith('sys_job_status');
    expect(api.listJob).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      jobName: undefined,
      jobGroup: undefined,
      status: undefined,
    });
    expect(page.rows()).toEqual(jobs);
  });

  it('新增任务提交后调 addJob 并刷新', () => {
    const page = create();
    api.listJob.mockClear();

    page.openAdd();
    expect(page.dialogTitle()).toBe('添加任务');

    page.form.patchValue({
      jobName: '新任务',
      invokeTarget: 'ryTask.new',
      cronExpression: '0/20 * * * * ?',
    });
    page.submitForm();

    expect(api.addJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobName: '新任务', invokeTarget: 'ryTask.new' }),
    );
    expect(success).toHaveBeenCalledWith('新增成功');
    expect(page.dialogVisible()).toBe(false);
    expect(api.listJob).toHaveBeenCalledTimes(1);
  });

  it('编辑任务回填并提交 updateJob', () => {
    const page = create();

    page.openEdit(jobs[1]);
    expect(page.form.controls.jobName.value).toBe('清理日志');
    expect(page.dialogTitle()).toBe('修改任务');

    page.submitForm();

    expect(api.updateJob).toHaveBeenCalledWith(expect.objectContaining({ jobId: 2 }));
    expect(success).toHaveBeenCalledWith('修改成功');
  });

  it('表单必填项缺失时不提交', () => {
    const page = create();

    page.openAdd();
    page.submitForm();

    expect(api.addJob).not.toHaveBeenCalled();
    expect(page.dialogVisible()).toBe(true);
  });

  it('状态切换：确认后调 changeJobStatus', () => {
    const page = create();

    page.statusChange(jobs[1], true);

    expect(api.changeJobStatus).toHaveBeenCalledWith(2, '0');
    expect(success).toHaveBeenCalledWith('启用成功');
  });

  it('状态切换：取消确认时不调接口', () => {
    const page = create();
    modal.setMode('cancel');

    page.statusChange(jobs[0], false);

    expect(api.changeJobStatus).not.toHaveBeenCalled();
  });

  it('立即执行：确认后调 runJob 且不刷新列表', () => {
    const page = create();
    api.listJob.mockClear();

    page.run(jobs[0]);

    expect(api.runJob).toHaveBeenCalledWith(1, 'DEFAULT');
    expect(success).toHaveBeenCalledWith('执行成功');
    expect(api.listJob).not.toHaveBeenCalled();
  });

  it('openView 打开详情弹窗', () => {
    const page = create();

    page.openView(jobs[0]);

    expect(page.detailRow()).toEqual(jobs[0]);
    expect(page.detailVisible()).toBe(true);
  });

  it('openJobLog 跳转调度日志页', () => {
    const page = create();

    page.openJobLog(jobs[1]);

    expect(navigate).toHaveBeenCalledWith(['/monitor/job-log/index', 2]);
  });

  it('删除：确认后调 delJob 并刷新', () => {
    const page = create();
    api.listJob.mockClear();

    page.delete(jobs[0]);

    expect(api.delJob).toHaveBeenCalledWith([1]);
    expect(success).toHaveBeenCalledWith('删除成功');
    expect(api.listJob).toHaveBeenCalledTimes(1);
  });

  it('批量删除使用勾选行', () => {
    const page = create();
    page.selection.onItemChecked(1, true);
    page.selection.onItemChecked(2, true);

    page.delete();

    expect(api.delJob).toHaveBeenCalledWith([1, 2]);
  });

  it('导出剥离分页参数', () => {
    const page = create();

    page.export();

    expect(download).toHaveBeenCalledWith(
      '/monitor/job/export',
      { jobName: undefined, jobGroup: undefined, status: undefined },
      expect.stringMatching(/^job_\d{14}\.xlsx$/),
    );
  });
});
