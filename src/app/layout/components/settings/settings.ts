import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { LayoutSetting, SettingsStore, SideTheme } from '@store/settings.store';

/** 可选主题色 */
const PRESET_COLORS = [
  '#409EFF',
  '#337ECC',
  '#1890FF',
  '#13C2C2',
  '#52C41A',
  '#FAAD14',
  '#F5222D',
  '#722ED1',
];

type BooleanKey = {
  [K in keyof LayoutSetting]: LayoutSetting[K] extends boolean ? K : never;
}[keyof LayoutSetting];

/** 侧栏主题选项 */
const SIDE_THEMES: { value: SideTheme; label: string; bg: string; fg: string }[] = [
  { value: 'theme-dark', label: '深色', bg: '#304156', fg: '#fff' },
  { value: 'theme-light', label: '浅色', bg: '#ffffff', fg: '#303133' },
];

/** 主题与布局设置抽屉，对应 ruoyi-vue3/src/layout/components/Settings/index.vue */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settings-panel',
  imports: [
    FormsModule,
    NzButtonModule,
    NzDividerModule,
    NzDrawerModule,
    NzIconModule,
    NzSwitchModule,
    NzTooltipModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.less',
})
export class SettingsPanel {
  private readonly message = inject(NzMessageService);

  readonly settings = inject(SettingsStore);
  readonly themeColors = PRESET_COLORS;
  readonly sideThemes = SIDE_THEMES;

  selectTheme(color: string): void {
    this.settings.changeSetting('theme', color);
  }

  selectSideTheme(theme: SideTheme): void {
    this.settings.changeSetting('sideTheme', theme);
  }

  toggle(key: BooleanKey, checked: boolean): void {
    this.settings.changeSetting(key, checked);
  }

  reset(): void {
    this.settings.resetSetting();
    this.message.success('已恢复默认配置');
  }
}
