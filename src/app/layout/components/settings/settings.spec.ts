import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NzMessageService } from 'ng-zorro-antd/message';
import { SettingsStore } from '@store/settings.store';
import { SettingsPanel } from './settings';

type Mock = ReturnType<typeof vi.fn>;

describe('SettingsPanel 布局设置', () => {
  let success: Mock;

  beforeEach(() => {
    success = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: NzMessageService, useValue: { success, error: vi.fn() } }],
    });
  });

  function create(): SettingsPanel {
    const fixture = TestBed.createComponent(SettingsPanel);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('提供预设主题色与侧栏主题选项', () => {
    const panel = create();

    expect(panel.themeColors.length).toBeGreaterThan(0);
    expect(panel.sideThemes.map((item) => item.value)).toEqual(['theme-dark', 'theme-light']);
  });

  it('选择主题色写入设置', () => {
    const panel = create();

    panel.selectTheme('#1890FF');

    expect(panel.settings.theme()).toBe('#1890FF');
  });

  it('切换侧栏主题写入设置', () => {
    const panel = create();

    panel.selectSideTheme('theme-light');

    expect(panel.settings.sideTheme()).toBe('theme-light');
  });

  it('开关布尔设置项', () => {
    const panel = create();

    panel.toggle('tagsView', false);
    expect(panel.settings.tagsView()).toBe(false);

    panel.toggle('fixedHeader', false);
    expect(panel.settings.fixedHeader()).toBe(false);
  });

  it('恢复默认配置并提示', () => {
    const panel = create();
    const settings = TestBed.inject(SettingsStore);
    settings.changeSetting('theme', '#722ED1');
    settings.changeSetting('tagsView', false);

    panel.reset();

    expect(panel.settings.theme()).toBe('#409EFF');
    expect(panel.settings.tagsView()).toBe(true);
    expect(success).toHaveBeenCalledWith('已恢复默认配置');
  });
});
