import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DictTypeApi } from '@api/system/dict/type';
import { DictDataApi } from '@api/system/dict/data';
import { DownloadService } from '@core/download.service';
import { SysDictData, SysDictType } from '@core/models/system';
import { DictStore } from '@store/dict.store';
import { stubModalService } from '@testing/modal-mock';
import { DictPage } from './dict';

type Mock = ReturnType<typeof vi.fn>;

describe('DictPage 字典管理', () => {
  let typeApi: {
    listType: Mock;
    addType: Mock;
    updateType: Mock;
    delType: Mock;
    refreshCache: Mock;
  };
  let dataApi: { listData: Mock; addData: Mock; updateData: Mock; delData: Mock };
  let download: Mock;
  let success: Mock;
  let warning: Mock;
  let getDict: Mock;
  let loadDict: Mock;
  let removeDict: Mock;
  let cleanDict: Mock;
  let modal: ReturnType<typeof stubModalService>;

  const types: SysDictType[] = [
    { dictId: 1, dictName: '用户性别', dictType: 'sys_user_sex', status: '0' },
    { dictId: 2, dictName: '系统状态', dictType: 'sys_normal_disable', status: '0' },
  ];
  const datas: SysDictData[] = [
    { dictCode: 11, dictLabel: '男', dictValue: '0', dictSort: 1, dictType: 'sys_user_sex' },
    { dictCode: 12, dictLabel: '女', dictValue: '1', dictSort: 2, dictType: 'sys_user_sex' },
  ];

  beforeEach(() => {
    typeApi = {
      listType: vi.fn(() => of({ code: 200, msg: '', rows: types, total: types.length })),
      addType: vi.fn(() => of({ code: 200, msg: '' })),
      updateType: vi.fn(() => of({ code: 200, msg: '' })),
      delType: vi.fn(() => of({ code: 200, msg: '' })),
      refreshCache: vi.fn(() => of({ code: 200, msg: '' })),
    };
    dataApi = {
      listData: vi.fn(() => of({ code: 200, msg: '', rows: datas, total: datas.length })),
      addData: vi.fn(() => of({ code: 200, msg: '' })),
      updateData: vi.fn(() => of({ code: 200, msg: '' })),
      delData: vi.fn(() => of({ code: 200, msg: '' })),
    };
    download = vi.fn(() => of(undefined));
    success = vi.fn();
    warning = vi.fn();
    getDict = vi.fn(() => [{ label: '正常', value: '0', listClass: 'primary' }]);
    loadDict = vi.fn(() => of([]));
    removeDict = vi.fn();
    cleanDict = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: DictTypeApi, useValue: typeApi },
        { provide: DictDataApi, useValue: dataApi },
        { provide: DownloadService, useValue: { download } },
        { provide: NzModalService, useValue: {} },
        { provide: NzMessageService, useValue: { success, warning, error: vi.fn() } },
        {
          provide: DictStore,
          useValue: { getDict, loadDict, setDict: vi.fn(), removeDict, cleanDict },
        },
      ],
    });
  });

  function create(): DictPage {
    const fixture = TestBed.createComponent(DictPage);
    modal = stubModalService(fixture.debugElement);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  describe('字典类型', () => {
    it('ngOnInit 首查类型列表并按需加载两个字典', () => {
      getDict.mockReturnValue(null);
      const page = create();

      expect(typeApi.listType).toHaveBeenCalledWith({
        pageNum: 1,
        pageSize: 10,
        dictName: undefined,
        dictType: undefined,
        status: undefined,
      });
      expect(loadDict).toHaveBeenCalledWith('sys_normal_disable');
      expect(loadDict).toHaveBeenCalledWith('sys_yes_no');
      expect(page.types()).toEqual(types);
      expect(page.typeTotal()).toBe(2);
    });

    it('resetTypeQuery 重置搜索条件与页码', () => {
      const page = create();
      page.typeSearch.patchValue({ dictName: '性别', dictType: 'sys_user_sex' });
      page.typePageNum.set(3);

      page.resetTypeQuery();

      expect(page.typePageNum()).toBe(1);
      expect(page.typeSearch.getRawValue()).toEqual({ dictName: '', dictType: '', status: '' });
    });

    it('selectType 记录当前字典类型并首查数据', () => {
      const page = create();

      page.selectType(types[0]);

      expect(page.currentType()).toBe('sys_user_sex');
      expect(dataApi.listData).toHaveBeenCalledWith(
        expect.objectContaining({ dictType: 'sys_user_sex', pageNum: 1, pageSize: 10 }),
      );
      expect(page.datas()).toEqual(datas);
      expect(page.dataCardTitle()).toBe('字典数据 - sys_user_sex');
    });

    it('未选择字典类型时不查询数据', () => {
      const page = create();

      page.getDataList();

      expect(dataApi.listData).not.toHaveBeenCalled();
    });

    it('新增类型提交后调 addType 并刷新', () => {
      const page = create();
      typeApi.listType.mockClear();

      page.openTypeAdd();
      expect(page.typeTitle()).toBe('添加字典类型');
      expect(page.typeDialog()).toBe(true);

      page.typeForm.patchValue({ dictName: '任务状态', dictType: 'sys_job_status' });
      page.submitType();

      expect(typeApi.addType).toHaveBeenCalledWith(
        expect.objectContaining({ dictName: '任务状态', dictType: 'sys_job_status' }),
      );
      expect(success).toHaveBeenCalledWith('新增成功');
      expect(page.typeDialog()).toBe(false);
      expect(typeApi.listType).toHaveBeenCalledTimes(1);
    });

    it('编辑类型回填并提交 updateType', () => {
      const page = create();

      page.openTypeEdit(types[0]);
      expect(page.typeTitle()).toBe('修改字典类型');
      expect(page.typeForm.controls.dictType.value).toBe('sys_user_sex');

      page.submitType();

      expect(typeApi.updateType).toHaveBeenCalledWith(
        expect.objectContaining({ dictId: 1, dictName: '用户性别' }),
      );
      expect(success).toHaveBeenCalledWith('修改成功');
    });

    it('表单无效时不提交', () => {
      const page = create();

      page.openTypeAdd();
      page.submitType();

      expect(typeApi.addType).not.toHaveBeenCalled();
      expect(page.typeDialog()).toBe(true);
    });

    it('删除类型：确认后调 delType 并清理字典缓存', () => {
      const page = create();
      typeApi.listType.mockClear();

      page.deleteType(types[1]);

      expect(typeApi.delType).toHaveBeenCalledWith([2]);
      expect(success).toHaveBeenCalledWith('删除成功');
      expect(cleanDict).toHaveBeenCalledTimes(1);
      expect(typeApi.listType).toHaveBeenCalledTimes(1);
    });

    it('批量删除使用勾选行', () => {
      const page = create();

      page.onTypeChecked(1, true);
      page.onTypeChecked(2, true);
      page.deleteType();

      expect(typeApi.delType).toHaveBeenCalledWith([1, 2]);
    });

    it('refreshCache 刷新缓存', () => {
      const page = create();

      page.refreshCache();

      expect(typeApi.refreshCache).toHaveBeenCalledTimes(1);
      expect(success).toHaveBeenCalledWith('刷新缓存成功');
      expect(cleanDict).toHaveBeenCalledTimes(1);
    });

    it('导出类型剥离分页参数', () => {
      const page = create();

      page.exportType();

      expect(download).toHaveBeenCalledWith(
        '/system/dict/type/export',
        { dictName: undefined, dictType: undefined, status: undefined },
        expect.stringMatching(/^dict_type_\d{14}\.xlsx$/),
      );
    });
  });

  describe('字典数据', () => {
    it('未选择类型时新增数据给出提示且不打开弹窗', () => {
      const page = create();

      page.openDataAdd();

      expect(warning).toHaveBeenCalledWith('请先在左侧选择一个字典类型');
      expect(page.dataDialog()).toBe(false);
    });

    it('新增数据提交后带上 dictType', () => {
      const page = create();
      page.selectType(types[0]);
      dataApi.listData.mockClear();

      page.openDataAdd();
      expect(page.dataTitle()).toBe('添加字典数据');

      page.dataForm.patchValue({ dictLabel: '未知', dictValue: '2', dictSort: 3 });
      page.submitData();

      expect(dataApi.addData).toHaveBeenCalledWith(
        expect.objectContaining({
          dictLabel: '未知',
          dictValue: '2',
          dictType: 'sys_user_sex',
        }),
      );
      expect(success).toHaveBeenCalledWith('新增成功');
      expect(removeDict).toHaveBeenCalledWith('sys_user_sex');
      expect(dataApi.listData).toHaveBeenCalledTimes(1);
    });

    it('编辑数据提交后调 updateData', () => {
      const page = create();
      page.selectType(types[0]);

      page.openDataEdit(datas[0]);
      expect(page.dataForm.controls.dictLabel.value).toBe('男');

      page.submitData();

      expect(dataApi.updateData).toHaveBeenCalledWith(
        expect.objectContaining({ dictCode: 11, dictLabel: '男' }),
      );
      expect(success).toHaveBeenCalledWith('修改成功');
    });

    it('删除数据：勾选多条时逐条删除并失效缓存', () => {
      const page = create();
      page.selectType(types[0]);
      dataApi.listData.mockClear();

      page.onDataChecked(11, true);
      page.onDataChecked(12, true);
      page.deleteData();

      expect(dataApi.delData).toHaveBeenCalledWith(11);
      expect(dataApi.delData).toHaveBeenCalledWith(12);
      expect(dataApi.delData).toHaveBeenCalledTimes(2);
      expect(success).toHaveBeenCalledWith('删除成功');
      expect(removeDict).toHaveBeenCalledTimes(1);
      expect(dataApi.listData).toHaveBeenCalledTimes(1);
    });

    it('删除数据：取消确认时不发起删除', () => {
      const page = create();
      page.selectType(types[0]);
      modal.setMode('cancel');

      page.deleteData(datas[0]);

      expect(dataApi.delData).not.toHaveBeenCalled();
    });

    it('导出数据带上当前字典类型', () => {
      const page = create();
      page.selectType(types[0]);

      page.exportData();

      expect(download).toHaveBeenCalledWith(
        '/system/dict/data/export',
        expect.objectContaining({ dictType: 'sys_user_sex' }),
        expect.stringMatching(/^dict_data_\d{14}\.xlsx$/),
      );
    });
  });
});
