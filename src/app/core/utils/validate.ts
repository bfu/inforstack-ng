/**
 * 通用校验工具
 * 对应 ruoyi-vue3/src/utils/validate.js
 */

/** 路径匹配，支持 * 与 ** 通配 */
export function isPathMatch(pattern: string, path: string): boolean {
  const regexPattern = pattern
    .replace(/([.+^${}()|[\]\\])/g, '\\$1')
    .replace(/\*\*/g, '__DOUBLE_STAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLE_STAR__/g, '.*')
    .replace(/\?/g, '[^/]');
  return new RegExp(`^${regexPattern}$`).test(path);
}

/** 判断字符串是否为空 */
export function isEmpty(value: unknown): boolean {
  return value == null || value === '' || value === 'undefined';
}

/** 判断是否为 http/https 地址 */
export function isHttp(url: string): boolean {
  return url.indexOf('http://') !== -1 || url.indexOf('https://') !== -1;
}

/** 判断是否为外链 */
export function isExternal(path: string): boolean {
  return /^(https?:|mailto:|tel:)/.test(path);
}

/** 判断是否合法 URL */
export function validURL(url: string): boolean {
  const reg =
    /^(https?|ftp):\/\/([a-zA-Z0-9.-]+(:[a-zA-Z0-9.&%$-]+)*@)*((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}|([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(:[0-9]+)*(\/($|[a-zA-Z0-9.,?'\\+&%$#=~_-]+))*$/;
  return reg.test(url);
}

/** 判断是否合法邮箱 */
export function validEmail(email: string): boolean {
  const reg =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return reg.test(email);
}
