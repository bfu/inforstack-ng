import { describe, expect, it } from 'vitest';
import { TableSelection } from './table-selection';

interface Row {
  id: number;
  name: string;
}

describe('TableSelection', () => {
  const rows: Row[] = [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
    { id: 3, name: 'c' },
  ];

  function makeSelection(rowsWithKey: (row: Row) => number | undefined) {
    return new TableSelection<Row, number>(rowsWithKey);
  }

  describe('基础勾选', () => {
    it('初始状态无勾选', () => {
      const s = makeSelection((row) => row.id);
      expect(s.selectedKeys()).toEqual([]);
      expect(s.count()).toBe(0);
      expect(s.single()).toBe(false);
      expect(s.multiple()).toBe(false);
      expect(s.allChecked()).toBe(false);
      expect(s.indeterminate()).toBe(false);
    });

    it('isChecked 按行判断，hasKey 按主键判断', () => {
      const s = makeSelection((row) => row.id);
      s.onItemChecked(1, true);
      expect(s.isChecked({ id: 1, name: 'a' })).toBe(true);
      expect(s.hasKey(1)).toBe(true);
      expect(s.isChecked({ id: 2, name: 'b' })).toBe(false);
      expect(s.hasKey(null)).toBe(false);
      expect(s.hasKey(undefined)).toBe(false);
    });

    it('keyOf 返回 undefined 的行不可勾选', () => {
      const s = makeSelection(() => undefined);
      s.onItemChecked(undefined, true);
      expect(s.selectedKeys()).toEqual([]);
      expect(s.isChecked({ id: 1, name: 'a' })).toBe(false);
    });

    it('再次取消勾选移除', () => {
      const s = makeSelection((row) => row.id);
      s.onItemChecked(1, true);
      s.onItemChecked(1, false);
      expect(s.selectedKeys()).toEqual([]);
    });
  });

  describe('全选与半选', () => {
    it('onAllChecked(true) 勾选当前页全部有效行', () => {
      const s = makeSelection((row) => row.id);
      s.onAllChecked(true, rows);
      expect(s.selectedKeys().sort()).toEqual([1, 2, 3]);
      expect(s.allChecked()).toBe(true);
      expect(s.indeterminate()).toBe(false);
    });

    it('onAllChecked(false) 清空全部（含跨页保留）', () => {
      const s = makeSelection((row) => row.id);
      s.onItemChecked(99, true); // 其他页保留的勾选
      s.onAllChecked(true, rows);
      s.onAllChecked(false, rows);
      expect(s.selectedKeys()).toEqual([]);
      expect(s.allChecked()).toBe(false);
      expect(s.indeterminate()).toBe(false);
    });

    it('部分勾选为半选状态', () => {
      const s = makeSelection((row) => row.id);
      s.onItemChecked(1, true);
      s.refresh(rows);
      expect(s.allChecked()).toBe(false);
      expect(s.indeterminate()).toBe(true);
    });

    it('refresh 空列表不勾选不半选', () => {
      const s = makeSelection((row) => row.id);
      s.onItemChecked(1, true);
      s.refresh([]);
      expect(s.allChecked()).toBe(false);
      expect(s.indeterminate()).toBe(false);
      // 跨页保留仍在
      expect(s.hasKey(1)).toBe(true);
    });
  });

  describe('toggle 与跨页保留', () => {
    it('toggle 切换勾选状态', () => {
      const s = makeSelection((row) => row.id);
      const row = rows[0];
      s.toggle(row, rows);
      expect(s.isChecked(row)).toBe(true);
      s.toggle(row, rows);
      expect(s.isChecked(row)).toBe(false);
    });

    it('跨页保留：切换页后 refresh 不清空已勾选', () => {
      const s = makeSelection((row) => row.id);
      s.onAllChecked(true, rows.slice(0, 2)); // 第一页
      s.refresh(rows.slice(2)); // 翻到第二页
      expect(s.selectedKeys().sort()).toEqual([1, 2]);
    });
  });

  describe('selectedRows / clear / 信号', () => {
    it('selectedRows 从传入行集中筛出已勾选行', () => {
      const s = makeSelection((row) => row.id);
      s.onItemChecked(2, true);
      s.onItemChecked(3, true);
      expect(s.selectedRows(rows)).toEqual([rows[1], rows[2]]);
    });

    it('clear 清空全部', () => {
      const s = makeSelection((row) => row.id);
      s.onAllChecked(true, rows);
      s.clear();
      expect(s.selectedKeys()).toEqual([]);
      expect(s.count()).toBe(0);
    });

    it('count / single / multiple 随勾选数变化', () => {
      const s = makeSelection((row) => row.id);
      s.onItemChecked(1, true);
      expect(s.count()).toBe(1);
      expect(s.single()).toBe(true);
      s.onItemChecked(2, true);
      expect(s.count()).toBe(2);
      expect(s.single()).toBe(false);
      expect(s.multiple()).toBe(true);
    });
  });
});
