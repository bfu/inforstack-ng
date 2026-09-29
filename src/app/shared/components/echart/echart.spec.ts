import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

// jsdom 未实现 ResizeObserver，需要全局桩
class ResizeObserverStub {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// mock echarts 动态加载（jsdom 无 canvas）
const mocks = vi.hoisted(() => {
  const setOption = vi.fn();
  const resize = vi.fn();
  const dispose = vi.fn();
  const init = vi.fn(() => ({ setOption, resize, dispose }));
  return { setOption, resize, dispose, init };
});
vi.mock('echarts', () => ({ init: mocks.init }));

import { Echart } from './echart';

@Component({
  selector: 'app-echart-host',
  imports: [Echart],
  template: `<app-echart [option]="option()" [height]="height()" />`,
})
class Host {
  readonly option = input<Record<string, unknown>>({ series: [] });
  readonly height = input('420px');
}

describe('Echart', () => {
  function setup(): void {
    TestBed.configureTestingModule({ imports: [Host] });
  }

  /** 等待 ngAfterViewInit 的异步 echarts import 完成 */
  async function flushAsyncImport(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  it('视图初始化后调用 echarts.init 并 setOption', async () => {
    setup();
    const fixture = TestBed.createComponent(Host);
    fixture.componentRef.setInput('option', { series: [{ type: 'bar' }] });
    await fixture.whenStable();
    await flushAsyncImport();

    expect(mocks.init).toHaveBeenCalledTimes(1);
    expect(mocks.setOption).toHaveBeenCalledWith({ series: [{ type: 'bar' }] });
  });

  it('option 变更时以 notMerge 整体替换', async () => {
    setup();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    await flushAsyncImport();
    mocks.setOption.mockClear();

    fixture.componentRef.setInput('option', { series: [{ type: 'line' }] });
    await fixture.whenStable();

    expect(mocks.setOption).toHaveBeenCalledWith({ series: [{ type: 'line' }] }, true);
  });

  it('window resize 触发 chart.resize', async () => {
    setup();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    await flushAsyncImport();
    mocks.resize.mockClear();

    window.dispatchEvent(new Event('resize'));

    expect(mocks.resize).toHaveBeenCalledTimes(1);
  });

  it('容器高度按输入渲染', async () => {
    setup();
    const fixture = TestBed.createComponent(Host);
    fixture.componentRef.setInput('height', '200px');
    await fixture.whenStable();

    const host = fixture.nativeElement.querySelector('.echart-host');
    expect(host.style.height).toBe('200px');
  });

  it('销毁时 dispose 图表并断开观察器', async () => {
    setup();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    await flushAsyncImport();

    fixture.destroy();

    expect(mocks.dispose).toHaveBeenCalledTimes(1);
  });
});
