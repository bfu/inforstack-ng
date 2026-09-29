import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { DictDataApi } from '@api/system/dict/data';
import { DictStore } from './dict.store';

describe('DictStore 字典缓存', () => {
  let store: DictStore;
  const apiMock = { getDicts: vi.fn() };

  const rawItem = {
    dictLabel: '男',
    dictValue: '0',
    listClass: 'default',
    cssClass: '',
  };
  const mappedItem = { label: '男', value: '0', listClass: 'default', cssClass: '' };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [DictStore, { provide: DictDataApi, useValue: apiMock }],
    });
    store = TestBed.inject(DictStore);
  });

  it('加载字典并完成字段映射（dictLabel→label）', async () => {
    apiMock.getDicts.mockReturnValue(of({ data: [rawItem] }));

    const items = await firstValueFrom(store.loadDict('sys_user_sex'));

    expect(items).toEqual([mappedItem]);
    expect(store.getDict('sys_user_sex')).toEqual([mappedItem]);
  });

  it('命中缓存后不再请求后端', async () => {
    apiMock.getDicts.mockReturnValue(of({ data: [rawItem] }));

    await firstValueFrom(store.loadDict('sys_user_sex'));
    await firstValueFrom(store.loadDict('sys_user_sex'));

    expect(apiMock.getDicts).toHaveBeenCalledTimes(1);
  });

  it('并发请求去重：同一字典只发一次请求', async () => {
    let calls = 0;
    apiMock.getDicts.mockImplementation(() => {
      calls++;
      return of({ data: [rawItem] });
    });

    const s1 = store.loadDict('sys_user_sex');
    const s2 = store.loadDict('sys_user_sex');
    await Promise.all([firstValueFrom(s1), firstValueFrom(s2)]);

    expect(calls).toBe(1);
  });

  it('请求失败后可重试（不缓存失败结果）', async () => {
    let fail = true;
    apiMock.getDicts.mockImplementation(() =>
      fail ? throwError(() => new Error('boom')) : of({ data: [rawItem] }),
    );

    await expect(firstValueFrom(store.loadDict('sys_user_sex'))).rejects.toThrow('boom');

    fail = false;
    const items = await firstValueFrom(store.loadDict('sys_user_sex'));
    expect(items).toEqual([mappedItem]);
    expect(apiMock.getDicts).toHaveBeenCalledTimes(2);
  });

  it('setDict / removeDict / cleanDict 维护缓存', () => {
    store.setDict('a', [mappedItem]);
    expect(store.getDict('a')).toEqual([mappedItem]);

    store.setDict('b', []);
    expect(store.getDict('b')).toEqual([]);

    store.removeDict('a');
    expect(store.getDict('a')).toBeNull();

    store.setDict('c', [mappedItem]);
    store.cleanDict();
    expect(store.getDict('c')).toBeNull();
    expect(store.getDict('b')).toBeNull();
  });

  it('空字典类型返回 null', () => {
    expect(store.getDict('')).toBeNull();
  });

  it('cleanDict 后重新加载会再次请求', async () => {
    apiMock.getDicts.mockReturnValue(of({ data: [rawItem] }));

    await firstValueFrom(store.loadDict('sys_user_sex'));
    store.cleanDict();
    await firstValueFrom(store.loadDict('sys_user_sex'));

    expect(apiMock.getDicts).toHaveBeenCalledTimes(2);
  });
});
