import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import type { EChartsOption } from 'echarts';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { CacheApi } from '@api/monitor/cache';
import { CacheInfo } from '@core/models/monitor';
import { Echart } from '@shared/components/echart/echart';

/** 基本信息展示行 */
interface InfoRow {
  label: string;
  value: string;
}

/**
 * 缓存监控，对应 ruoyi-vue3/src/views/monitor/cache/index.vue
 * 两个图表（命令统计玫瑰饼图、内存消耗仪表盘）由通用 echarts 组件渲染
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-cache-page',
  imports: [Echart, NzCardModule, NzDescriptionsModule, NzGridModule],
  templateUrl: './cache.html',
  styleUrl: './cache.less',
})
export class CachePage implements OnInit {
  private readonly api = inject(CacheApi);

  readonly cache = signal<CacheInfo>({});
  readonly loading = signal(false);

  /** Redis 已使用内存（人类可读），仪表盘与提示共用 */
  private readonly usedMemory = computed(() => this.cache().info?.['used_memory_human'] ?? '');

  readonly infoRows = computed<InfoRow[]>(() => {
    const info = this.cache().info ?? {};
    return [
      { label: 'Redis版本', value: info['redis_version'] ?? '' },
      { label: '运行模式', value: info['redis_mode'] === 'standalone' ? '单机' : '集群' },
      { label: '端口', value: info['tcp_port'] ?? '' },
      { label: '客户端数', value: info['connected_clients'] ?? '' },
      { label: '运行时间(天)', value: info['uptime_in_days'] ?? '' },
      { label: '使用内存', value: info['used_memory_human'] ?? '' },
      { label: '使用CPU', value: this.usedCpu() },
      { label: '内存配置', value: info['maxmemory_human'] ?? '' },
      { label: 'AOF是否开启', value: info['aof_enabled'] === '0' ? '否' : '是' },
      { label: 'RDB是否成功', value: info['rdb_last_bgsave_status'] ?? '' },
      { label: 'Key数量', value: String(this.cache().dbSize ?? '') },
      {
        label: '网络入口/出口',
        value: `${info['instantaneous_input_kbps'] ?? ''}kps/${info['instantaneous_output_kbps'] ?? ''}kps`,
      },
    ];
  });

  /** 命令统计玫瑰饼图 */
  readonly commandOption = computed<EChartsOption>(() => ({
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c} ({d}%)' },
    color: [
      '#37a2da',
      '#32c5e9',
      '#67e0e3',
      '#9fe6b8',
      '#ffdb5c',
      '#ff9f7f',
      '#fb7293',
      '#e7bcf3',
      '#8378ea',
    ],
    series: [
      {
        name: '命令',
        type: 'pie',
        roseType: 'radius',
        radius: [15, 95],
        center: ['50%', '38%'],
        data: (this.cache().commandStats ?? []).map((item) => ({
          name: item.name ?? '',
          value: Number(item.value ?? 0),
        })),
        animationEasing: 'cubicInOut',
        animationDuration: 1000,
      },
    ],
  }));

  /** 内存消耗仪表盘 */
  readonly memoryOption = computed<EChartsOption>(() => {
    const usedMemory = this.usedMemory();
    return {
      tooltip: { formatter: `{b} <br/>{a} : ${usedMemory}` },
      series: [
        {
          name: '峰值',
          type: 'gauge',
          min: 0,
          max: 1000,
          detail: { formatter: usedMemory },
          data: [{ value: parseFloat(usedMemory), name: '内存消耗' }],
        },
      ],
    };
  });

  private usedCpu(): string {
    const raw = this.cache().info?.['used_cpu_user_children'] ?? '';
    const value = parseFloat(raw);
    return Number.isNaN(value) ? raw : value.toFixed(2);
  }

  ngOnInit(): void {
    this.getList();
  }

  getList(): void {
    this.loading.set(true);
    this.api.getCache().subscribe({
      next: (res) => {
        this.cache.set(res.data ?? {});
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
