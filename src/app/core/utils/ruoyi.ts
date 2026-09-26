/**
 * 通用方法封装处理（TypeScript 版）
 * 对应 ruoyi-vue3/src/utils/ruoyi.js
 */

/** 日期格式化，pattern 支持 {y}{m}{d}{h}{i}{s}{a} */
export function parseTime(
  time: Date | string | number | null | undefined,
  pattern?: string,
): string | null {
  if (!time) {
    return null;
  }
  const format = pattern || '{y}-{m}-{d} {h}:{i}:{s}';
  let date: Date;
  if (time instanceof Date) {
    date = time;
  } else {
    let value: string | number = time;
    if (typeof value === 'string') {
      if (/^[0-9]+$/.test(value)) {
        value = parseInt(value, 10);
      } else {
        value = value.replace(/-/gm, '/').replace('T', ' ').replace(/\.[\d]{3}/gm, '');
      }
    }
    if (typeof value === 'number' && value.toString().length === 10) {
      value = value * 1000;
    }
    date = new Date(value);
  }
  const formatObj: Record<string, number> = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay(),
  };
  return format.replace(/{(y|m|d|h|i|s|a)+}/g, (result, key: string) => {
    let value: string | number = formatObj[key];
    if (key === 'a') {
      return ['日', '一', '二', '三', '四', '五', '六'][value];
    }
    if (result.length > 0 && value < 10) {
      value = '0' + value;
    }
    return String(value ?? 0);
  });
}

/** 转换字符串，undefined/null 等转化为空串 */
export function parseStrEmpty(str: unknown): string {
  if (!str || str === 'undefined' || str === 'null') {
    return '';
  }
  return String(str);
}

/**
 * 添加日期范围查询参数（后端以 params[beginTime] 形式接收）
 */
export function addDateRange<T extends Record<string, unknown>>(
  params: T,
  dateRange: unknown[],
  propName?: string,
): T {
  const search: Record<string, unknown> = { ...params };
  const map: Record<string, unknown> =
    typeof search['params'] === 'object' && search['params'] !== null && !Array.isArray(search['params'])
      ? { ...(search['params'] as Record<string, unknown>) }
      : {};
  const range = Array.isArray(dateRange) ? dateRange : [];
  if (typeof propName === 'undefined') {
    map['beginTime'] = range[0];
    map['endTime'] = range[1];
  } else {
    map['begin' + propName] = range[0];
    map['end' + propName] = range[1];
  }
  search['params'] = map;
  return search as T;
}

/** 回显数据字典（单个值） */
export function selectDictLabel(datas: Array<{ value: string; label: string }>, value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  const matched = datas.find((item) => item.value === String(value));
  return matched ? matched.label : String(value);
}

/** 回显数据字典（字符串、数组，支持分隔符） */
export function selectDictLabels(
  datas: Array<{ value: string; label: string }>,
  value: unknown,
  separator?: string,
): string {
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
    return '';
  }
  const currentSeparator = separator === undefined ? ',' : separator;
  const raw = Array.isArray(value) ? value.join(currentSeparator) : String(value);
  return raw
    .split(currentSeparator)
    .map((item) => {
      const matched = datas.find((d) => d.value === item);
      return matched ? matched.label : item;
    })
    .join(currentSeparator);
}

/**
 * 参数处理：对象 → query string，嵌套对象展开为 key[subKey]=value
 * 后端通过 params[xxx] 接收，因此必须使用该序列化而非 HttpParams
 */
export function tansParams(params: Record<string, unknown>): string {
  let result = '';
  for (const propName of Object.keys(params)) {
    const value = params[propName];
    const part = encodeURIComponent(propName) + '=';
    if (value !== null && value !== '' && typeof value !== 'undefined') {
      if (typeof value === 'object') {
        for (const key of Object.keys(value as Record<string, unknown>)) {
          const subValue = (value as Record<string, unknown>)[key];
          if (subValue !== null && subValue !== '' && typeof subValue !== 'undefined') {
            const subPart = encodeURIComponent(propName + '[' + key + ']') + '=';
            result += subPart + encodeURIComponent(String(subValue)) + '&';
          }
        }
      } else {
        result += part + encodeURIComponent(String(value)) + '&';
      }
    }
  }
  return result;
}

/** 返回规范化路径 */
export function getNormalPath(p: string): string {
  if (p.length === 0 || !p || p === 'undefined') {
    return p;
  }
  const res = p.replace('//', '/');
  if (res[res.length - 1] === '/') {
    return res.slice(0, -1);
  }
  return res;
}

/** 验证是否为 blob 格式（非 json 即视为文件流） */
export function blobValidate(data: Blob): boolean {
  return data.type !== 'application/json';
}

/**
 * 构造树型结构数据
 */
export function handleTree<T>(
  data: T[],
  id = 'id',
  parentId = 'parentId',
  children = 'children',
): T[] {
  const childrenListMap: Record<string, Record<string, unknown>> = {};
  const tree: T[] = [];
  for (const d of data as unknown as Record<string, unknown>[]) {
    childrenListMap[String(d[id])] = d;
    if (!d[children]) {
      d[children] = [];
    }
  }
  for (const d of data as unknown as Record<string, unknown>[]) {
    const parentObj = childrenListMap[String(d[parentId])];
    if (!parentObj) {
      tree.push(d as unknown as T);
    } else {
      (parentObj[children] as unknown[]).push(d);
    }
  }
  return tree;
}
