import { computed, Signal, signal, WritableSignal } from '@angular/core';

/**
 * 表格多选状态（选中集合 + 全选/半选）
 * 对应 ruoyi-vue3 各页面重复的 checkedIds / allChecked / indeterminate 逻辑，
 * 避免每个列表页各写一份
 *
 * @typeParam T 行数据类型
 * @typeParam K 行主键类型
 */
export class TableSelection<T, K extends string | number = number> {
  private readonly keys: WritableSignal<Set<K>> = signal(new Set<K>());
  private readonly allCheckedState = signal(false);
  private readonly indeterminateState = signal(false);

  /** 已选中数量 */
  readonly count: Signal<number> = computed(() => this.keys().size);
  /** 仅选中一条 */
  readonly single: Signal<boolean> = computed(() => this.keys().size === 1);
  /** 至少选中一条 */
  readonly multiple: Signal<boolean> = computed(() => this.keys().size > 0);
  readonly allChecked: Signal<boolean> = this.allCheckedState.asReadonly();
  readonly indeterminate: Signal<boolean> = this.indeterminateState.asReadonly();

  constructor(private readonly keyOf: (row: T) => K | undefined) {}

  /** 指定行是否被选中 */
  isChecked(row: T): boolean {
    const key = this.keyOf(row);
    return key !== undefined && this.keys().has(key);
  }

  /** 指定主键是否被选中 */
  hasKey(key?: K | null): boolean {
    return key !== undefined && key !== null && this.keys().has(key);
  }

  /** 单行勾选变化 */
  onItemChecked(key: K | undefined | null, checked: boolean): void {
    if (key === undefined || key === null) {
      return;
    }
    const next = new Set(this.keys());
    if (checked) {
      next.add(key);
    } else {
      next.delete(key);
    }
    this.keys.set(next);
  }

  /** 表头全选：勾选/取消当前页全部行 */
  onAllChecked(checked: boolean, rows: T[]): void {
    const next = new Set<K>();
    if (checked) {
      for (const row of rows) {
        const key = this.keyOf(row);
        if (key !== undefined) {
          next.add(key);
        }
      }
    }
    this.keys.set(next);
    this.allCheckedState.set(checked);
    this.indeterminateState.set(false);
  }

  /** 行点击切换勾选（等同 ruoyi-vue3 的 clickRow） */
  toggle(row: T, rows: T[]): void {
    this.onItemChecked(this.keyOf(row), !this.isChecked(row));
    this.refresh(rows);
  }

  /** 数据刷新后重算全选/半选状态 */
  refresh(rows: T[]): void {
    const list = rows ?? [];
    const selected = list.filter((row) => this.isChecked(row)).length;
    this.allCheckedState.set(list.length > 0 && selected === list.length);
    this.indeterminateState.set(selected > 0 && selected < list.length);
  }

  /** 当前数据中的选中行 */
  selectedRows(rows: T[]): T[] {
    return rows.filter((row) => this.isChecked(row));
  }

  /** 全部选中主键（含跨页保留的） */
  selectedKeys(): K[] {
    return [...this.keys()];
  }

  clear(): void {
    this.keys.set(new Set());
    this.allCheckedState.set(false);
    this.indeterminateState.set(false);
  }
}
