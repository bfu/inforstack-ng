import { Component, HostListener, inject } from '@angular/core';
import { AppStore } from '../store/app.store';
import { SettingsStore } from '../store/settings.store';
import { environment } from '../../environments/environment';
import { AppMain } from './components/app-main/app-main';
import { Navbar } from './components/navbar/navbar';
import { SettingsPanel } from './components/settings/settings';
import { Sidebar } from './components/sidebar/sidebar';
import { TagsView } from './components/tags-view/tags-view';

/** 响应式断点，与 ruoyi-vue3 保持一致 */
const MOBILE_WIDTH = 992;

/**
 * 主框架布局
 * 对应 ruoyi-vue3/src/layout/index.vue
 */
@Component({
  selector: 'app-layout',
  imports: [Sidebar, Navbar, TagsView, AppMain, SettingsPanel],
  templateUrl: './layout.html',
  styleUrl: './layout.less',
})
export class Layout {
  readonly app = inject(AppStore);
  readonly settings = inject(SettingsStore);

  readonly footerContent = environment.footerContent;

  constructor() {
    this.syncDevice(window.innerWidth);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent): void {
    this.syncDevice((event.target as Window).innerWidth);
  }

  private syncDevice(width: number): void {
    this.app.toggleDevice(width - 1 < MOBILE_WIDTH ? 'mobile' : 'desktop');
  }
}
