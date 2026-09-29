import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { PostApi } from '@api/system/post';
import { DownloadService } from '@core/download.service';
import { SysPost } from '@core/models/system';
import { DictStore } from '@store/dict.store';
import { UserStore } from '@store/user.store';
import { stubModalService } from '@testing/modal-mock';
import { PostPage } from './post';

type Mock = ReturnType<typeof vi.fn>;

describe('PostPage 岗位管理', () => {
  let listPost: Mock;
  let addPost: Mock;
  let updatePost: Mock;
  let delPost: Mock;
  let download: Mock;
  let confirm: Mock;
  let success: Mock;
  let getDict: ReturnType<typeof vi.fn>;
  let loadDict: ReturnType<typeof vi.fn>;

  const posts: SysPost[] = [
    { postId: 1, postName: '董事长', postCode: 'ceo', postSort: 1, status: '0' },
    { postId: 2, postName: '项目经理', postCode: 'pm', postSort: 2, status: '0' },
  ];

  beforeEach(() => {
    listPost = vi.fn(() => of({ code: 200, msg: '', rows: posts, total: posts.length }));
    addPost = vi.fn(() => of({ code: 200, msg: '' }));
    updatePost = vi.fn(() => of({ code: 200, msg: '' }));
    delPost = vi.fn(() => of({ code: 200, msg: '' }));
    download = vi.fn(() => of(undefined));
    success = vi.fn();
    getDict = vi.fn(() => [{ label: '正常', value: '0', listClass: 'primary' }]);
    loadDict = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: PostApi, useValue: { listPost, addPost, updatePost, delPost } },
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

  function create(): PostPage {
    const fixture = TestBed.createComponent(PostPage);
    confirm = stubModalService(fixture.debugElement).confirm;
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('ngOnInit 发起首查并写入列表状态', async () => {
    const page = await create();

    expect(listPost).toHaveBeenCalledWith({
      pageNum: 1,
      pageSize: 10,
      postCode: undefined,
      postName: undefined,
      status: undefined,
    });
    expect(page.rows()).toEqual(posts);
    expect(page.total()).toBe(2);
    expect(page.loading()).toBe(false);
  });

  it('字典未缓存时加载', async () => {
    getDict.mockReturnValue(null);
    await create();

    expect(loadDict).toHaveBeenCalledWith('sys_normal_disable');
  });

  it('字典已缓存时不重复加载', async () => {
    await create();

    expect(loadDict).not.toHaveBeenCalled();
  });

  it('搜索条件与分页参数传递给查询', async () => {
    const page = await create();
    page.searchForm.patchValue({ postName: '经理', status: '1' });
    page.onQueryParams({ pageIndex: 2, pageSize: 20 } as NzTableQueryParams);

    expect(page.pageNum()).toBe(2);
    expect(page.pageSize()).toBe(20);
    expect(listPost).toHaveBeenLastCalledWith({
      pageNum: 2,
      pageSize: 20,
      postCode: undefined,
      postName: '经理',
      status: '1',
    });
  });

  it('resetQuery 重置搜索与页码', async () => {
    const page = await create();
    page.searchForm.patchValue({ postName: 'x' });
    page.pageNum.set(3);

    page.resetQuery();

    expect(page.pageNum()).toBe(1);
    expect(page.searchForm.getRawValue()).toEqual({ postCode: '', postName: '', status: '' });
  });

  it('新增：提交后调 addPost、提示成功并刷新列表', async () => {
    const page = await create();
    listPost.mockClear();

    page.openAdd();
    expect(page.dialogVisible()).toBe(true);
    expect(page.dialogTitle()).toBe('添加岗位');

    page.form.patchValue({ postName: '新岗位', postCode: 'new', postSort: 5 });
    page.submitForm();

    expect(addPost).toHaveBeenCalledTimes(1);
    expect(page.dialogVisible()).toBe(false);
    expect(success).toHaveBeenCalledWith('新增成功');
    expect(listPost).toHaveBeenCalledTimes(1);
  });

  it('编辑：回填表单并提交后调 updatePost', async () => {
    const page = await create();
    listPost.mockClear();

    page.openEdit(posts[0]);
    expect(page.dialogTitle()).toBe('修改岗位');
    expect(page.form.controls.postName.value).toBe('董事长');

    page.submitForm();

    expect(updatePost).toHaveBeenCalledWith(
      expect.objectContaining({ postId: 1, postName: '董事长' }),
    );
    expect(success).toHaveBeenCalledWith('修改成功');
  });

  it('表单无效时不提交', async () => {
    const page = await create();

    page.openAdd();
    page.submitForm();

    expect(addPost).not.toHaveBeenCalled();
    expect(page.dialogVisible()).toBe(true);
  });

  it('删除：确认后调 delPost 并刷新', async () => {
    const page = await create();
    listPost.mockClear();

    page.delete(posts[0]);

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(delPost).toHaveBeenCalledWith([1]);
    expect(success).toHaveBeenCalledWith('删除成功');
    expect(listPost).toHaveBeenCalledTimes(1);
  });

  it('批量删除使用已勾选行，无勾选不弹窗', async () => {
    const page = await create();

    page.delete();
    expect(confirm).not.toHaveBeenCalled();

    page.selection.onItemChecked(1, true);
    page.selection.onItemChecked(2, true);
    page.delete();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(delPost).toHaveBeenCalledWith([1, 2]);
  });

  it('导出：下载地址与剥离分页参数', async () => {
    const page = await create();

    page.export();

    expect(download).toHaveBeenCalledWith(
      '/system/post/export',
      { postCode: undefined, postName: undefined, status: undefined },
      expect.stringMatching(/^post_\d{14}\.xlsx$/),
    );
    expect(success).toHaveBeenCalledWith('导出成功');
  });
});
