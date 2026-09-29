import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { DictPipe } from './dict.pipe';
import { DictStore } from '@store/dict.store';

const items = [
  { label: '男', value: '0', listClass: 'default' },
  { label: '女', value: '1', listClass: 'default' },
];

describe('DictPipe', () => {
  let getDict: ReturnType<typeof vi.fn>;
  let loadDict: ReturnType<typeof vi.fn>;

  function makePipe(): DictPipe {
    return TestBed.runInInjectionContext(() => new DictPipe()) as DictPipe;
  }

  function setupStore(cached: boolean): void {
    getDict = vi.fn(() => (cached ? items : null));
    loadDict = vi.fn(() => of(items));
    TestBed.configureTestingModule({
      providers: [
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
      ],
    });
  }

  it('dictType 为空时返回原值', () => {
    setupStore(true);
    const pipe = makePipe();
    expect(pipe.transform('0', '')).toBe('0');
  });

  it('value 为 null/undefined 返回空串', () => {
    setupStore(true);
    const pipe = makePipe();
    expect(pipe.transform(null, 'sys_user_sex')).toBe('');
    expect(pipe.transform(undefined, 'sys_user_sex')).toBe('');
  });

  it('字典未加载：返回原值且触发一次 loadDict', () => {
    setupStore(false);
    const pipe = makePipe();

    expect(pipe.transform('0', 'sys_user_sex')).toBe('0');
    expect(loadDict).toHaveBeenCalledTimes(1);
    expect(loadDict).toHaveBeenCalledWith('sys_user_sex');
  });

  it('impure 管道多次调用同一 dictType 只触发一次 loadDict（去重）', () => {
    setupStore(false);
    const pipe = makePipe();

    pipe.transform('0', 'sys_user_sex');
    pipe.transform('1', 'sys_user_sex');
    pipe.transform('0', 'sys_user_sex');

    expect(loadDict).toHaveBeenCalledTimes(1);
  });

  it('不同 dictType 各自触发一次加载', () => {
    setupStore(false);
    const pipe = makePipe();

    pipe.transform('0', 'dict-a');
    pipe.transform('0', 'dict-b');

    expect(loadDict).toHaveBeenCalledTimes(2);
  });

  it('字典命中后翻译为 label', () => {
    setupStore(true);
    const pipe = makePipe();

    expect(pipe.transform('0', 'sys_user_sex')).toBe('男');
    expect(pipe.transform('1', 'sys_user_sex')).toBe('女');
    // 未匹配项原样返回
    expect(pipe.transform('9', 'sys_user_sex')).toBe('9');
    // 多值按分隔符回显
    expect(pipe.transform('0,1', 'sys_user_sex')).toBe('男,女');
  });
});
