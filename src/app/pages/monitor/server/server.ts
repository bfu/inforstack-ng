import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTableModule } from 'ng-zorro-antd/table';
import { ServerApi } from '@api/monitor/server';
import { ServerInfo } from '@core/models/monitor';

/** 内存 / JVM 对照行 */
interface MemRow {
  label: string;
  mem: string;
  jvm: string;
  memWarning?: boolean;
  jvmWarning?: boolean;
}

/** 服务监控，对应 ruoyi-vue3/src/views/monitor/server/index.vue */
@Component({
  selector: 'app-server-page',
  imports: [NzCardModule, NzDescriptionsModule, NzGridModule, NzTableModule],
  templateUrl: './server.html',
  styleUrl: './server.less',
})
export class ServerPage implements OnInit {
  private readonly api = inject(ServerApi);

  readonly server = signal<ServerInfo>({});
  readonly loading = signal(false);

  readonly cpu = computed(() => this.server().cpu ?? {});
  readonly mem = computed(() => this.server().mem ?? {});
  readonly jvm = computed(() => this.server().jvm ?? {});
  readonly sys = computed(() => this.server().sys ?? {});
  readonly sysFiles = computed(() => this.server().sysFiles ?? []);

  readonly memRows = computed<MemRow[]>(() => {
    const mem = this.server().mem ?? {};
    const jvm = this.server().jvm ?? {};
    return [
      { label: '总内存', mem: `${mem.total ?? ''}G`, jvm: `${jvm.total ?? ''}M` },
      { label: '已用内存', mem: `${mem.used ?? ''}G`, jvm: `${jvm.used ?? ''}M` },
      { label: '剩余内存', mem: `${mem.free ?? ''}G`, jvm: `${jvm.free ?? ''}M` },
      {
        label: '使用率',
        mem: `${mem.usage ?? ''}%`,
        jvm: `${jvm.usage ?? ''}%`,
        memWarning: (mem.usage ?? 0) > 80,
        jvmWarning: (jvm.usage ?? 0) > 80,
      },
    ];
  });

  ngOnInit(): void {
    this.getList();
  }

  getList(): void {
    this.loading.set(true);
    this.api.getServer().subscribe({
      next: (res) => {
        this.server.set(res.data ?? {});
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** 使用率超过 80% 标红 */
  isDanger(usage?: number): boolean {
    return (usage ?? 0) > 80;
  }
}
