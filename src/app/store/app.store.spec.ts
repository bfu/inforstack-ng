import { beforeEach, describe, expect, it } from 'vitest';
import { AppStore } from './app.store';

describe('AppStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('默认侧边栏展开（无持久化时）', () => {
    const store = new AppStore();
    expect(store.sidebarOpened()).toBe(true);
    expect(store.device()).toBe('desktop');
    expect(store.isMobile()).toBe(false);
  });

  it('持久化为关闭时初始为收起', () => {
    localStorage.setItem('sidebarStatus', '0');
    const store = new AppStore();
    expect(store.sidebarOpened()).toBe(false);
  });

  it('toggleSideBar 切换并持久化', () => {
    const store = new AppStore();
    store.toggleSideBar();
    expect(store.sidebarOpened()).toBe(false);
    expect(localStorage.getItem('sidebarStatus')).toBe('0');

    store.toggleSideBar();
    expect(store.sidebarOpened()).toBe(true);
    expect(localStorage.getItem('sidebarStatus')).toBe('1');
  });

  it('hide 状态下 toggleSideBar 不生效', () => {
    const store = new AppStore();
    store.toggleSideBarHide(true);
    store.toggleSideBar();

    expect(store.sidebarOpened()).toBe(true);
  });

  it('closeSideBar 收起并持久化为 0', () => {
    const store = new AppStore();
    store.closeSideBar();
    expect(store.sidebarOpened()).toBe(false);
    expect(localStorage.getItem('sidebarStatus')).toBe('0');
  });

  it('toggleDevice 到 mobile 时自动收起侧边栏', () => {
    const store = new AppStore();
    store.toggleDevice('mobile');

    expect(store.device()).toBe('mobile');
    expect(store.isMobile()).toBe(true);
    expect(store.sidebarOpened()).toBe(false);
  });
});
