import { Component, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { AppStore } from '@store/app.store';
import { MenuNode, PermissionStore } from '@store/permission.store';
import { DEFAULT_MENU_ICON } from '@layout/icon-map';
import { SettingsStore } from '@store/settings.store';
import { environment } from '@env/environment';
import { isExternal } from '@core/utils/validate';

/** 内联菜单每层缩进，与 ng-zorro nzInlineIndent 默认值保持一致 */
const INLINE_INDENT = 24;

/**
 * 侧边栏：Logo + 后端菜单树递归渲染
 * 对应 ruoyi-vue3/src/layout/components/Sidebar/index.vue
 */
@Component({
  selector: 'app-sidebar',
  imports: [NgTemplateOutlet, RouterLink, NzIconModule, NzMenuModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.less',
})
export class Sidebar {
  readonly app = inject(AppStore);
  readonly settings = inject(SettingsStore);
  readonly permission = inject(PermissionStore);

  readonly title = environment.title;
  /** 菜单未配置图标时的兜底图标 */
  readonly defaultIcon = DEFAULT_MENU_ICON;
  readonly menus = this.permission.sidebarRouters;
  readonly collapsed = computed(() => !this.app.sidebarOpened());
  /** 随侧栏主题切换菜单明暗 */
  readonly menuTheme = computed<'light' | 'dark'>(() =>
    this.settings.sideTheme() === 'theme-light' ? 'light' : 'dark',
  );

  /** 供 ngTemplateOutlet 递归时做类型推断 */
  asNodes(nodes: unknown): MenuNode[] {
    return (nodes ?? []) as MenuNode[];
  }

  /**
   * 是否为外链菜单（http(s)://、mailto:、tel:）。
   * 外链不能用 routerLink 做站内跳转，需渲染成原生 a 标签新窗口打开
   * 对应 ruoyi-vue3/src/layout/components/Sidebar/Link.vue
   */
  isExternalLink(path: string): boolean {
    return isExternal(path);
  }

  /**
   * 计算菜单项的左缩进（px）。
   *
   * ng-zorro 的菜单层级（NzSubmenuService.level）依赖「元素注入器」逐级累加，
   * 而递归 ng-template 的嵌入视图注入上下文取自「声明处」（根 nz-menu），
   * 拿不到父级 NzSubmenuService，层级恒为 1，所有层级缩进相同（没有缩进）。
   * 这里显式把层级通过 ngTemplateOutlet 的上下文传下去，自行计算缩进。
   *
   * 折叠态返回 0：此时子菜单是浮层弹出（vertical 模式），不需要额外缩进，
   * 交给 ng-zorro 自己的折叠样式处理（0 / null 会回退到组件内部计算值）。
   */
  paddingOf(level: number): number {
    return this.collapsed() ? 0 : level * INLINE_INDENT;
  }
}
