import { NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { TreeSelectNode } from '@core/models/result';

/** 后端下拉树节点 → ng-zorro 树节点 */
export function toTreeNodes(nodes: TreeSelectNode[]): NzTreeNodeOptions[] {
  return nodes.map((node) => ({
    title: node.label,
    key: String(node.id),
    isLeaf: !node.children?.length,
    children: node.children?.length ? toTreeNodes(node.children as TreeSelectNode[]) : undefined,
  }));
}

/** 后端下拉树节点 → ng-zorro 树选择节点 */
export function toTreeSelectNodes(nodes: TreeSelectNode[]): NzTreeNodeOptions[] {
  return toTreeNodes(nodes);
}

/**
 * 勾选的 key 归一为提交用的 id 列表。
 *
 * ng-zorro 的 check 事件只回传「最上层已勾选节点」（勾选父节点时其子孙会被合并掉），
 * 而 RuoYi 后端需要完整关联：勾选父节点要带上全部子孙节点，勾选子节点要带上各级
 * 父节点（含半选父节点），与 ruoyi-vue3 的
 * `getCheckedKeys() + getHalfCheckedKeys()` 行为一致。
 *
 * @param nodes 当前树数据（toTreeNodes 的产物，key 为菜单/部门 id 的字符串形式）
 * @param keys 已勾选的 key（事件回传值或后端回填的 checkedKeys）
 */
export function expandCheckedKeys(nodes: NzTreeNodeOptions[], keys: readonly string[]): number[] {
  const parentOf = new Map<string, string>();
  const childrenOf = new Map<string, NzTreeNodeOptions[]>();
  const walk = (list: NzTreeNodeOptions[], parent?: NzTreeNodeOptions): void => {
    for (const node of list) {
      if (!node.key) {
        continue;
      }
      if (parent?.key) {
        parentOf.set(node.key, parent.key);
      }
      if (node.children?.length) {
        childrenOf.set(node.key, node.children);
        walk(node.children, node);
      }
    }
  };
  walk(nodes);

  const result = new Set<string>();
  const addWithDescendants = (key: string): void => {
    if (result.has(key)) {
      return;
    }
    result.add(key);
    for (const child of childrenOf.get(key) ?? []) {
      if (child.key) {
        addWithDescendants(child.key);
      }
    }
  };
  // 先统一向下展开全部子孙，再向上补齐各级父节点；
  // 向上的已访问集合必须独立，否则某个父节点先于其子孙进入结果集时会漏掉更上层节点
  const seenAncestors = new Set<string>();
  const addAncestors = (key: string): void => {
    let current = parentOf.get(key);
    while (current && !seenAncestors.has(current)) {
      seenAncestors.add(current);
      result.add(current);
      current = parentOf.get(current);
    }
  };
  for (const key of keys) {
    addWithDescendants(key);
  }
  for (const key of keys) {
    addAncestors(key);
  }
  // 按树的前序遍历顺序输出（父节点在前、子孙在后），与 ruoyi-vue3 提交顺序一致；
  // 不在树数据里的 key（异常兜底）追加在末尾，避免静默丢弃关联
  const ordered: string[] = [];
  const visit = (list: NzTreeNodeOptions[]): void => {
    for (const node of list) {
      if (node.key && result.has(node.key)) {
        ordered.push(node.key);
      }
      if (node.children?.length) {
        visit(node.children);
      }
    }
  };
  visit(nodes);
  for (const key of result) {
    if (!ordered.includes(key)) {
      ordered.push(key);
    }
  }
  return ordered.map(Number);
}
