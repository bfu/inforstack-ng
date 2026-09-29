import { provideNzIcons } from 'ng-zorro-antd/icon';
import { provideNzI18n, zh_CN } from 'ng-zorro-antd/i18n';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { icons } from './app/icons-provider';

/**
 * 单元测试公共 Providers（由 angular.json 的 test.providersFile 引用）。
 * 页面模板大量使用 nz-icon，未注册图标会在渲染时抛 IconNotFoundError，
 * 故在此统一注册应用图标集，并复用与生产一致的中文 i18n 与日期适配器。
 */
export default [provideNzIcons(icons), provideNzI18n(zh_CN), provideNzDateFnsAdapter()];
