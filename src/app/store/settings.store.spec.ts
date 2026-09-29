import { Title } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsStore } from './settings.store';

describe('SettingsStore', () => {
  let setTitle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    setTitle = vi.fn();
    TestBed.configureTestingModule({
      providers: [SettingsStore, { provide: Title, useValue: { setTitle } }],
    });
    TestBed.inject(SettingsStore);
    TestBed.tick?.();
  });

  function flushEffects(): void {
    // 手动 flush effect（zoneless 下 effect 排队执行）
    TestBed.flushEffects?.();
  }

  it('默认配置生效', () => {
    const store = TestBed.inject(SettingsStore);
    expect(store.setting()).toMatchObject({
      theme: '#409EFF',
      sideTheme: 'theme-dark',
      tagsView: true,
      fixedHeader: true,
      sidebarLogo: true,
    });
  });

  it('持久化的配置覆盖默认值', () => {
    localStorage.setItem('layout-setting', JSON.stringify({ theme: '#13c2c2', tagsView: false }));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [SettingsStore, { provide: Title, useValue: { setTitle } }],
    });
    const store = TestBed.inject(SettingsStore);

    expect(store.theme()).toBe('#13c2c2');
    expect(store.tagsView()).toBe(false);
  });

  it('changeSetting 更新信号并持久化', () => {
    const store = TestBed.inject(SettingsStore);
    store.changeSetting('fixedHeader', false);

    expect(store.fixedHeader()).toBe(false);
    expect(JSON.parse(localStorage.getItem('layout-setting') ?? '{}')).toMatchObject({
      fixedHeader: false,
    });
  });

  it('resetSetting 恢复默认并持久化', () => {
    const store = TestBed.inject(SettingsStore);
    store.changeSetting('theme', '#000000');
    store.resetSetting();

    expect(store.theme()).toBe('#409EFF');
    expect(JSON.parse(localStorage.getItem('layout-setting') ?? '{}')).toMatchObject({
      theme: '#409EFF',
    });
  });

  it('openPanel / closePanel 切换面板状态', () => {
    const store = TestBed.inject(SettingsStore);
    expect(store.panelOpen()).toBe(false);

    store.openPanel();
    expect(store.panelOpen()).toBe(true);

    store.closePanel();
    expect(store.panelOpen()).toBe(false);
  });

  it('主题色写入 CSS 变量', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [SettingsStore, { provide: Title, useValue: { setTitle } }],
    });
    const store = TestBed.inject(SettingsStore);
    store.changeSetting('theme', '#ff4d4f');
    flushEffects();

    expect(document.documentElement.style.getPropertyValue('--primary-color')).toBe('#ff4d4f');
  });

  it('动态标题：开启后按 页面标题 - 系统标题 拼接', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [SettingsStore, { provide: Title, useValue: { setTitle } }],
    });
    const store = TestBed.inject(SettingsStore);

    store.changeSetting('dynamicTitle', true);
    store.setPageTitle('用户管理');
    flushEffects();

    const calls = setTitle.mock.calls.map((args: unknown[]) => args[0]);
    expect(calls).toContain('用户管理 - 若依管理系统');
  });
});
