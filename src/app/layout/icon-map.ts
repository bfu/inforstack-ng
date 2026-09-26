import { icons } from '../icons-provider';

/**
 * RuoYi 菜单图标名 → ant design 图标名映射。
 *
 * 后端 sys_menu.icon 存的是 RuoYi 自有 svg 名称（对应 ruoyi-vue3/src/assets/icons/svg/*.svg），
 * ng-zorro 并不认识这些名称，这里统一转换成 ant design 图标名（icons-provider.ts 中已注册）。
 */
export const MENU_ICON_MAP: Record<string, string> = {
  // 首页 / 监控
  index: 'dashboard',
  dashboard: 'dashboard',
  monitor: 'area-chart',
  chart: 'bar-chart',
  druid: 'experiment',
  server: 'database',
  redis: 'hdd',
  'redis-list': 'unordered-list',
  online: 'desktop',
  swagger: 'api',
  guide: 'compass',
  build: 'build',
  tool: 'tool',

  // 系统管理
  system: 'setting',
  user: 'user',
  people: 'user',
  peoples: 'team',
  post: 'idcard',
  dict: 'book',
  dept: 'apartment',
  tree: 'apartment',
  'tree-table': 'table',
  table: 'table',
  log: 'file-text',
  logininfor: 'login',
  job: 'schedule',
  message: 'notification',
  documentation: 'file-text',
  password: 'key',
  lock: 'lock',
  validCode: 'safety-certificate',

  // 表单 / 通用
  form: 'form',
  edit: 'edit',
  input: 'edit',
  textarea: 'file-text',
  select: 'down',
  radio: 'check-circle',
  checkbox: 'check-square',
  cascader: 'apartment',
  switch: 'swap',
  slider: 'control',
  rate: 'star',
  upload: 'upload',
  download: 'download',
  clipboard: 'copy',
  search: 'search',
  list: 'unordered-list',
  row: 'bars',
  nested: 'apartment',
  example: 'appstore',
  component: 'appstore',
  button: 'border',
  tab: 'layout',
  date: 'calendar',
  'date-range': 'calendar',
  time: 'clock-circle',
  'time-range': 'clock-circle',
  number: 'calculator',
  dateTime: 'clock-circle',

  // 其它组件示例
  '404': 'exclamation-circle',
  bell: 'bell',
  bug: 'bug',
  code: 'code',
  color: 'bg-colors',
  theme: 'bg-colors',
  drag: 'drag',
  education: 'read',
  email: 'mail',
  enter: 'login',
  excel: 'file-excel',
  pdf: 'file-pdf',
  zip: 'file-zip',
  'exit-fullscreen': 'fullscreen-exit',
  fullscreen: 'fullscreen',
  eye: 'eye',
  'eye-open': 'eye',
  github: 'github',
  qq: 'qq',
  wechat: 'wechat',
  icon: 'smile',
  international: 'global',
  language: 'global',
  link: 'link',
  money: 'dollar',
  moon: 'bulb',
  sunny: 'bulb',
  'more-up': 'up',
  phone: 'phone',
  question: 'question-circle',
  shopping: 'shopping',
  size: 'font-size',
  skill: 'trophy',
  star: 'star',
};

/** 菜单管理页可选的图标名（RuoYi 原始名，保存回后端） */
export const MENU_ICON_NAMES: string[] = Object.keys(MENU_ICON_MAP).sort();

/** 未配置图标时使用的默认图标 */
export const DEFAULT_MENU_ICON = 'appstore';

/** 已注册的 ant design 图标名，用于兜底校验，避免渲染不存在的图标 */
const REGISTERED_ICONS = new Set<string>(icons.map((icon) => icon.name));

/**
 * 解析菜单图标：RuoYi 图标名 → ant design 图标名。
 * 未命中映射、或映射结果未注册时回退到默认图标，避免出现 404 与图标不存在的报错。
 */
export function resolveMenuIcon(icon?: string | null): string {
  const name = icon?.trim();
  if (!name) {
    return DEFAULT_MENU_ICON;
  }
  const target = MENU_ICON_MAP[name] ?? name;
  return REGISTERED_ICONS.has(target) ? target : DEFAULT_MENU_ICON;
}
