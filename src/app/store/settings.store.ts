import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { cache } from '../core/utils/cache';
import { environment } from '../../environments/environment';

export type SideTheme = 'theme-dark' | 'theme-light';

/** 布局设置项，对应 ruoyi-vue3/src/settings.js */
export interface LayoutSetting {
  /** 主题色 */
  theme: string;
  /** 侧边栏主题 */
  sideTheme: SideTheme;
  /** 是否显示布局配置入口 */
  showSettings: boolean;
  /** 是否显示标签页 */
  tagsView: boolean;
  /** 是否固定头部 */
  fixedHeader: boolean;
  /** 是否显示 Logo */
  sidebarLogo: boolean;
  /** 是否显示底部版权 */
  footerVisible: boolean;
  /** 是否显示动态标题 */
  dynamicTitle: boolean;
}

const STORAGE_KEY = 'layout-setting';

const DEFAULT_SETTING: LayoutSetting = {
  theme: '#409EFF',
  sideTheme: 'theme-dark',
  showSettings: true,
  tagsView: true,
  fixedHeader: true,
  sidebarLogo: true,
  footerVisible: false,
  dynamicTitle: false,
};

function loadSetting(): LayoutSetting {
  return { ...DEFAULT_SETTING, ...(cache.local.getJSON<Partial<LayoutSetting>>(STORAGE_KEY) ?? {}) };
}

/**
 * 布局设置存储（持久化到 localStorage）
 * 对应 ruoyi-vue3/src/store/modules/settings.js
 */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly _setting = signal<LayoutSetting>(loadSetting());
  private readonly _title = signal(environment.title);
  private readonly _pageTitle = signal('');
  private readonly _panelOpen = signal(false);

  readonly setting = this._setting.asReadonly();
  readonly theme = computed(() => this._setting().theme);
  readonly sideTheme = computed(() => this._setting().sideTheme);
  readonly showSettings = computed(() => this._setting().showSettings);
  readonly tagsView = computed(() => this._setting().tagsView);
  readonly fixedHeader = computed(() => this._setting().fixedHeader);
  readonly sidebarLogo = computed(() => this._setting().sidebarLogo);
  readonly footerVisible = computed(() => this._setting().footerVisible);
  readonly dynamicTitle = computed(() => this._setting().dynamicTitle);
  /** 设置面板是否展开 */
  readonly panelOpen = this._panelOpen.asReadonly();

  private readonly titleService = inject(Title);

  constructor() {
    effect(() => {
      const dynamic = this.dynamicTitle();
      this.titleService.setTitle(dynamic ? `${this._pageTitle()} - ${this._title()}` : this._title());
    });
    // 主题色写入 CSS 变量，供自定义组件样式消费
    effect(() => {
      document.documentElement.style.setProperty('--primary-color', this._setting().theme);
    });
  }

  openPanel(): void {
    this._panelOpen.set(true);
  }

  closePanel(): void {
    this._panelOpen.set(false);
  }

  /** 修改布局设置并持久化 */
  changeSetting<K extends keyof LayoutSetting>(key: K, value: LayoutSetting[K]): void {
    const next = { ...this._setting(), [key]: value };
    this._setting.set(next);
    cache.local.setJSON(STORAGE_KEY, next);
  }

  /** 设置当前页面标题（供动态标题使用） */
  setPageTitle(title: string): void {
    this._pageTitle.set(title);
  }

  /** 恢复默认设置 */
  resetSetting(): void {
    this._setting.set({ ...DEFAULT_SETTING });
    cache.local.setJSON(STORAGE_KEY, { ...DEFAULT_SETTING });
  }
}
