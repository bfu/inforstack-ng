import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { DictTag } from './dict-tag';
import { DictStore } from '@store/dict.store';

const sexItems = [
  { label: '男', value: '0', listClass: 'default' },
  { label: '女', value: '1', listClass: 'primary' },
];

@Component({
  selector: 'app-dict-tag-host',
  imports: [DictTag],
  template: `<app-dict-tag [value]="value()" [dictType]="dictType()" />`,
})
class Host {
  readonly value = input<unknown>('0');
  readonly dictType = input('sys_user_sex');
}

describe('DictTag', () => {
  let getDict: ReturnType<typeof vi.fn>;
  let loadDict: ReturnType<typeof vi.fn>;

  function setup(cached: boolean): void {
    getDict = vi.fn(() => (cached ? sexItems : null));
    loadDict = vi.fn(() => of(sexItems));
    TestBed.configureTestingModule({
      imports: [Host],
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

  async function render(value: unknown, dictType = 'sys_user_sex') {
    const fixture = TestBed.createComponent(Host);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('dictType', dictType);
    await fixture.whenStable();
    return fixture;
  }

  it('字典命中时渲染 label 文本', async () => {
    setup(true);
    const fixture = await render('0');

    const tag = fixture.nativeElement.querySelector('nz-tag');
    expect(tag.textContent.trim()).toBe('男');
  });

  it('listClass 映射为标签颜色', async () => {
    setup(true);
    const fixture = await render('1'); // primary → blue

    const tag = fixture.nativeElement.querySelector('nz-tag');
    expect(tag.className).toContain('ant-tag-blue');
  });

  it('未命中 listClass 回退空颜色', async () => {
    setup(true);
    const fixture = await render('0'); // default → ''

    const tag = fixture.nativeElement.querySelector('nz-tag');
    expect(tag.className).not.toContain('ant-tag-blue');
    expect(tag.className).not.toContain('ant-tag-green');
  });

  it('字典未加载时显示原始值并触发 loadDict', async () => {
    setup(false);
    const fixture = await render('0');

    expect(loadDict).toHaveBeenCalledWith('sys_user_sex');
    const tag = fixture.nativeElement.querySelector('nz-tag');
    expect(tag.textContent.trim()).toBe('0');
  });

  it('字典已缓存时不再触发 loadDict', async () => {
    setup(true);
    await render('0');

    expect(loadDict).not.toHaveBeenCalled();
  });

  it('value 为 null 时文本为空串', async () => {
    setup(true);
    const fixture = await render(null);

    const tag = fixture.nativeElement.querySelector('nz-tag');
    expect(tag.textContent.trim()).toBe('');
  });

  it('多值回显与未匹配原样保留', async () => {
    setup(true);
    const fixture = await render('0,9');

    const tag = fixture.nativeElement.querySelector('nz-tag');
    expect(tag.textContent.trim()).toBe('男,9');
  });
});
