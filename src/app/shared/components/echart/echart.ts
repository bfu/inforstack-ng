import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { ECharts, EChartsOption } from 'echarts';
import { fromEvent } from 'rxjs';

/**
 * 通用 echarts 容器组件
 * 负责 init / setOption / resize / dispose，按需动态加载 echarts 以避免首屏体积膨胀
 *
 * 用法：<app-echart [option]="option()" height="420px" />
 * 注：ruoyi-vue3 使用 macarons 主题，此处改用默认主题 + 自定义色板（主题文件未按 exports 暴露）
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-echart',
  template: `<div class="echart-host" #host [style.height]="height()"></div>`,
  styleUrl: './echart.less',
})
export class Echart implements AfterViewInit, OnDestroy {
  private readonly hostRef = viewChild.required<ElementRef<HTMLDivElement>>('host');

  /** 图表配置，变更时整体替换（notMerge） */
  readonly option = input.required<EChartsOption>();
  /** 容器高度，默认与 ruoyi-vue3 缓存监控一致 */
  readonly height = input<string>('420px');

  private chart: ECharts | null = null;
  private observer: ResizeObserver | null = null;
  private disposed = false;

  constructor() {
    effect(() => {
      const option = this.option();
      if (this.chart) {
        this.chart.setOption(option, true);
      }
    });
    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.chart?.resize());
  }

  async ngAfterViewInit(): Promise<void> {
    const echarts = await import('echarts');
    if (this.disposed) {
      return;
    }
    const host = this.hostRef().nativeElement;
    this.chart = echarts.init(host);
    this.chart.setOption(this.option());
    // 侧边栏折叠等容器尺寸变化（window resize 未必触发宽度变化）
    this.observer = new ResizeObserver(() => this.chart?.resize());
    this.observer.observe(host);
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.observer?.disconnect();
    this.observer = null;
    this.chart?.dispose();
    this.chart = null;
  }
}
