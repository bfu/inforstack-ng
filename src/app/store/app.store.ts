import { Injectable, computed, signal } from '@angular/core';
import { cache } from '@core/utils/cache';

export type DeviceType = 'desktop' | 'mobile';

interface SidebarState {
  opened: boolean;
  withoutAnimation: boolean;
  hide: boolean;
}

const SIDEBAR_STATUS_KEY = 'sidebarStatus';

/**
 * 应用布局状态（侧边栏开合、设备类型）
 * 对应 ruoyi-vue3/src/store/modules/app.js
 */
@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly _sidebar = signal<SidebarState>({
    opened: cache.local.get(SIDEBAR_STATUS_KEY) !== '0',
    withoutAnimation: false,
    hide: false,
  });
  private readonly _device = signal<DeviceType>('desktop');

  readonly sidebar = this._sidebar.asReadonly();
  readonly device = this._device.asReadonly();
  readonly sidebarOpened = computed(() => this._sidebar().opened);
  readonly isMobile = computed(() => this._device() === 'mobile');

  toggleSideBar(withoutAnimation = false): void {
    if (this._sidebar().hide) {
      return;
    }
    const opened = !this._sidebar().opened;
    this._sidebar.set({ ...this._sidebar(), opened, withoutAnimation });
    cache.local.set(SIDEBAR_STATUS_KEY, opened ? '1' : '0');
  }

  closeSideBar(withoutAnimation = false): void {
    cache.local.set(SIDEBAR_STATUS_KEY, '0');
    this._sidebar.set({ ...this._sidebar(), opened: false, withoutAnimation });
  }

  toggleDevice(device: DeviceType): void {
    this._device.set(device);
    if (device === 'mobile') {
      this.closeSideBar(true);
    }
  }

  toggleSideBarHide(hide: boolean): void {
    this._sidebar.set({ ...this._sidebar(), hide });
  }
}
