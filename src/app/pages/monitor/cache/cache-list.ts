import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTableModule } from 'ng-zorro-antd/table';
import { CacheApi } from '@api/monitor/cache';
import { SysCache } from '@core/models/monitor';

/**
 * 缓存列表，对应 ruoyi-vue3/src/views/monitor/cache/list.vue
 * 三栏结构：缓存名称 → 键名 → 缓存内容
 */
@Component({
  selector: 'app-cache-list-page',
  imports: [
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzTableModule,
  ],
  templateUrl: './cache-list.html',
  styleUrl: './cache-list.less',
})
export class CacheListPage implements OnInit {
  private readonly api = inject(CacheApi);
  private readonly message = inject(NzMessageService);

  readonly cacheNames = signal<SysCache[]>([]);
  readonly cacheKeys = signal<string[]>([]);
  readonly cacheForm = signal<SysCache>({});

  readonly loading = signal(false);
  readonly keyLoading = signal(false);

  /** 当前选中的缓存名称，键名与内容查询均以此为前缀 */
  readonly currentCacheName = signal('');

  ngOnInit(): void {
    this.getCacheNames();
  }

  getCacheNames(): void {
    this.loading.set(true);
    this.api.getCacheNames().subscribe({
      next: (res) => {
        this.cacheNames.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** 刷新缓存名称列表 */
  refreshCacheNames(): void {
    this.getCacheNames();
    this.message.success('刷新缓存列表成功');
  }

  /** 清理指定名称下的全部缓存 */
  clearCacheName(row: SysCache): void {
    const cacheName = row.cacheName ?? '';
    if (!cacheName) {
      return;
    }
    this.api.clearCacheName(cacheName).subscribe({
      next: () => {
        this.message.success(`清理缓存名称[${this.nameFormatter(cacheName)}]成功`);
        this.getCacheKeys(row);
      },
    });
  }

  /** 查询（或切换）缓存键名列表 */
  getCacheKeys(row?: SysCache): void {
    const cacheName = row?.cacheName ?? this.currentCacheName();
    if (cacheName === '') {
      return;
    }
    this.keyLoading.set(true);
    this.api.getCacheKeys(cacheName).subscribe({
      next: (res) => {
        this.cacheKeys.set(res.data ?? []);
        this.currentCacheName.set(cacheName);
        this.keyLoading.set(false);
      },
      error: () => this.keyLoading.set(false),
    });
  }

  /** 刷新键名列表 */
  refreshCacheKeys(): void {
    this.getCacheKeys();
    this.message.success('刷新键名列表成功');
  }

  /** 清理指定键名 */
  clearCacheKey(cacheKey: string): void {
    this.api.clearCacheKey(cacheKey).subscribe({
      next: () => {
        this.message.success(`清理缓存键名[${this.keyFormatter(cacheKey)}]成功`);
        this.getCacheKeys();
      },
    });
  }

  /** 清理全部缓存 */
  clearCacheAll(): void {
    this.api.clearCacheAll().subscribe({
      next: () => this.message.success('清理全部缓存成功'),
    });
  }

  /** 查询缓存内容 */
  handleCacheValue(cacheKey: string): void {
    this.api.getCacheValue(this.currentCacheName(), cacheKey).subscribe({
      next: (res) => this.cacheForm.set(res.data ?? {}),
    });
  }

  /** 缓存名称去掉 ':' 前缀 */
  nameFormatter(cacheName?: string): string {
    return (cacheName ?? '').replace(':', '');
  }

  /** 键名去掉当前缓存名称前缀 */
  keyFormatter(cacheKey?: string): string {
    const prefix = this.currentCacheName();
    return prefix ? (cacheKey ?? '').replace(prefix, '') : (cacheKey ?? '');
  }
}
