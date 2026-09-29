import { describe, expect, it } from 'vitest';
import {
  addDateRange,
  blobValidate,
  getNormalPath,
  handleTree,
  parseStrEmpty,
  parseTime,
  selectDictLabel,
  selectDictLabels,
  tansParams,
} from './ruoyi';

describe('parseTime 日期格式化', () => {
  it('Date 对象默认 pattern', () => {
    // 本地时间构造，避免时区影响
    expect(parseTime(new Date(2024, 0, 2, 3, 4, 5))).toBe('2024-01-02 03:04:05');
  });

  it('自定义 pattern 与补零', () => {
    expect(parseTime(new Date(2024, 0, 2, 3, 4, 5), '{y}/{m}/{d}')).toBe('2024/01/02');
    expect(parseTime(new Date(2024, 10, 1), '{y}-{m}-{d}')).toBe('2024-11-01');
  });

  it('{a} 输出星期', () => {
    // 2024-01-02 是周二
    expect(parseTime(new Date(2024, 0, 2), '{a}')).toBe('二');
  });

  it('毫秒时间戳（13 位）', () => {
    const ts = new Date(2024, 0, 2, 3, 4, 5).getTime();
    expect(parseTime(ts, '{y}-{m}-{d}')).toBe('2024-01-02');
  });

  it('秒时间戳（10 位）按秒解释', () => {
    const ts = Math.floor(new Date(2024, 0, 2, 3, 4, 5).getTime() / 1000);
    expect(parseTime(ts, '{y}-{m}-{d} {h}:{i}:{s}')).toBe('2024-01-02 03:04:05');
  });

  it('纯数字字符串与 ISO 字符串', () => {
    const ts = new Date(2024, 0, 2, 3, 4, 5).getTime();
    expect(parseTime(String(ts), '{y}-{m}-{d}')).toBe('2024-01-02');
    expect(parseTime('2024-01-02T03:04:05', '{y}-{m}-{d}')).toBe('2024-01-02');
  });

  it('空值返回 null', () => {
    expect(parseTime(null)).toBeNull();
    expect(parseTime(undefined)).toBeNull();
    expect(parseTime(0)).toBeNull();
  });
});

describe('parseStrEmpty', () => {
  it('null / undefined / "null" / "undefined" 转空串', () => {
    expect(parseStrEmpty(null)).toBe('');
    expect(parseStrEmpty(undefined)).toBe('');
    expect(parseStrEmpty('null')).toBe('');
    expect(parseStrEmpty('undefined')).toBe('');
  });

  it('正常值原样返回字符串', () => {
    expect(parseStrEmpty('abc')).toBe('abc');
    expect(parseStrEmpty(123)).toBe('123');
  });
});

describe('addDateRange', () => {
  it('默认写入 params.beginTime / endTime', () => {
    const result = addDateRange({ pageNum: 1 }, ['2024-01-01', '2024-01-31']);
    expect(result).toEqual({
      pageNum: 1,
      params: { beginTime: '2024-01-01', endTime: '2024-01-31' },
    });
  });

  it('propName 拼接到 begin/end 之后', () => {
    const result = addDateRange<{ params?: Record<string, unknown> }>({}, ['a', 'b'], 'Time');
    expect(result.params).toEqual({ beginTime: 'a', endTime: 'b' });
  });

  it('保留已有 params 对象中的其他字段', () => {
    const result = addDateRange({ params: { other: 1 } }, ['a', 'b']);
    expect(result.params).toEqual({ other: 1, beginTime: 'a', endTime: 'b' });
  });

  it('非数组范围时值为 undefined', () => {
    const result = addDateRange<{ params?: Record<string, unknown> }>(
      {},
      undefined as unknown as [],
    );
    expect(result.params).toEqual({ beginTime: undefined, endTime: undefined });
  });
});

describe('selectDictLabel / selectDictLabels', () => {
  const datas = [
    { value: '0', label: '男' },
    { value: '1', label: '女' },
  ];

  it('命中返回 label，未命中返回原值', () => {
    expect(selectDictLabel(datas, '0')).toBe('男');
    expect(selectDictLabel(datas, 1)).toBe('女');
    expect(selectDictLabel(datas, '2')).toBe('2');
  });

  it('null / undefined 返回空串', () => {
    expect(selectDictLabel(datas, null)).toBe('');
    expect(selectDictLabel(datas, undefined)).toBe('');
  });

  it('多值按分隔符逐个回显', () => {
    expect(selectDictLabels(datas, '0,1')).toBe('男,女');
    expect(selectDictLabels(datas, '0,2', ',')).toBe('男,2');
    expect(selectDictLabels(datas, ['0', '1'])).toBe('男,女');
    expect(selectDictLabels(datas, null)).toBe('');
  });
});

describe('tansParams', () => {
  it('平铺参数序列化并跳过空值', () => {
    const result = tansParams({
      a: 1,
      b: '',
      c: null,
      d: undefined,
      e: 'x y',
    });
    expect(result).toContain('a=1&');
    expect(result).toContain('e=x%20y&');
    expect(result).not.toContain('b=');
    expect(result).not.toContain('c=');
  });

  it('嵌套对象展开为 key[subKey]=value', () => {
    const result = tansParams({ params: { beginTime: '2024-01-01', endTime: null } });
    expect(result).toContain('params%5BbeginTime%5D=2024-01-01');
    expect(result).not.toContain('endTime');
  });
});

describe('getNormalPath / blobValidate', () => {
  it('合并首个双斜杠并去掉尾部斜杠', () => {
    expect(getNormalPath('//a/b/')).toBe('/a/b');
    expect(getNormalPath('/a')).toBe('/a');
    expect(getNormalPath('')).toBe('');
  });

  it('非 json blob 视为文件流', () => {
    expect(blobValidate(new Blob(['x'], { type: 'application/vnd.ms-excel' }))).toBe(true);
    expect(blobValidate(new Blob(['{}'], { type: 'application/json' }))).toBe(false);
  });
});

describe('handleTree', () => {
  interface TreeNode {
    id: number;
    parentId: number;
    children?: unknown[];
  }

  it('按 id/parentId 组装树', () => {
    const root: TreeNode = { id: 1, parentId: 0 };
    const c1: TreeNode = { id: 2, parentId: 1 };
    const c2: TreeNode = { id: 3, parentId: 1 };
    const tree = handleTree([root, c1, c2]);
    expect(tree).toEqual([root]);
    expect(root.children).toEqual([c1, c2]);
  });

  it('支持自定义 id / parentId / children 字段名', () => {
    const root = { deptId: 1, parentId: 0 } as { deptId: number; children?: unknown[] };
    const child = { deptId: 2, parentId: 1 };
    const tree = handleTree([root, child], 'deptId', 'parentId', 'children');
    expect(tree).toEqual([root]);
    expect(root.children).toEqual([child]);
  });

  it('父节点不存在时视为根节点', () => {
    const orphan: TreeNode = { id: 9, parentId: 999 };
    const tree = handleTree([orphan]);
    expect(tree).toEqual([orphan]);
  });

  it('无子节点的元素被补上空 children 数组（原地修改）', () => {
    const leaf: TreeNode = { id: 1, parentId: 0 };
    handleTree([leaf]);
    expect(leaf.children).toEqual([]);
  });
});
