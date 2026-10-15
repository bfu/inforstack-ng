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

/** 收集树中所有节点 key（含后代），用于让 nz-tree 展开全部节点 */
export function collectTreeKeys(nodes: NzTreeNodeOptions[]): string[] {
  const keys: string[] = [];
  const walk = (list: NzTreeNodeOptions[]): void => {
    for (const node of list) {
      keys.push(String(node.key));
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return keys;
}

/**
 * 收集根级节点 key。
 *
 * 「展开/折叠」只作用于根级节点，对齐 RuoYi-Vue3 的 `handleCheckedTreeExpand`：
 * 它只遍历 `menuOptions`（根数组）去设置 `store.nodesMap[id].expanded`，更深层节点不动。
 */
export function collectRootKeys(nodes: NzTreeNodeOptions[]): string[] {
  return nodes.map((node) => String(node.key));
}

/** 按 key 归一化勾选集合，便于用 Set 判定 */
function toKeySet(checkedKeys: Iterable<string>): Set<string> {
  return new Set(Array.from(checkedKeys, (key) => String(key)));
}

/**
 * 把展开状态写进树节点数据。
 *
 * 不能只靠 `[nzExpandedKeys]`：`NzTreeBaseService.conductExpandedKeys` 里是
 * `node.setExpanded(keys.has(key) || node.isExpanded === true)`，那个 `|| node.isExpanded`
 * 意味着**节点一旦展开就再也折叠不回去**——传空数组只会「什么都不做」。
 * 故折叠必须重建 `nzData`，让 `NzTreeNode` 构造函数从 `option.expanded` 重新取初值。
 */
export function withExpandedKeys(
  nodes: NzTreeNodeOptions[],
  expandedKeys: Iterable<string>,
): NzTreeNodeOptions[] {
  const picked = toKeySet(expandedKeys);
  return nodes.map((node) => ({
    ...node,
    expanded: picked.has(String(node.key)),
    children: node.children?.length ? withExpandedKeys(node.children, picked) : undefined,
  }));
}

/**
 * 把勾选状态写进树节点数据。
 *
 * 不能靠 `[nzCheckedKeys]` 回填：`NzTreeComponent.renderTreeProperties` 里
 * `if (nzCheckStrictly) handleCheckedKeys(null)` 排在 `handleCheckedKeys(nzCheckedKeys)` 之后，
 * 只要模板绑定了 `nzCheckStrictly`，回填就会被 `conductCheck(null, ...)` 覆盖，
 * 而它读的正是节点的 `origin.checked`。故回填只能走节点自带的 `checked`。
 */
export function withCheckedKeys(
  nodes: NzTreeNodeOptions[],
  checkedKeys: Iterable<string>,
): NzTreeNodeOptions[] {
  const picked = toKeySet(checkedKeys);
  return nodes.map((node) => ({
    ...node,
    checked: picked.has(String(node.key)),
    children: node.children?.length ? withCheckedKeys(node.children, picked) : undefined,
  }));
}

/**
 * 拆分后端返回的勾选键，决定哪些能写进节点 `checked`、哪些只能提交时原样带上。
 *
 * - `fillable`：可以安全回填的键。
 * - `carried`：联动模式下无法在树上表示的键，以及树上找不到的键（例如编辑者本人看不到该菜单），
 *   原样保留，避免「打开弹窗不动任何东西直接保存」时被静默删除。
 *
 * 为什么联动模式下非叶子键不能回填：ng-zorro 会给已勾选的非叶子节点向下传播勾选状态
 * （`NzTreeNode` 构造函数里 `option.checked` 会写进子节点，`conductCheck` 后
 * `refreshCheckState` 还会对非叶子执行 `conductDown`），于是「只授权了页面、没授权按钮」
 * 这类键会把整棵子树一起勾上，保存后权限被放大。
 */
export function splitBackfillKeys(
  nodes: NzTreeNodeOptions[],
  checkedKeys: Iterable<string>,
  linked: boolean,
): { fillable: string[]; carried: string[] } {
  const picked = toKeySet(checkedKeys);
  const seen = new Set<string>();
  const fillable: string[] = [];
  const carried: string[] = [];
  const walk = (list: NzTreeNodeOptions[]): void => {
    for (const node of list) {
      const key = String(node.key);
      seen.add(key);
      if (picked.has(key)) {
        if (linked && node.children?.length) {
          carried.push(key);
        } else {
          fillable.push(key);
        }
      }
      if (node.children?.length) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  for (const key of picked) {
    if (!seen.has(key)) {
      carried.push(key);
    }
  }
  return { fillable, carried };
}

/**
 * 联动（父子关联）模式下，由树上勾选的「端点」推导出后端需要的完整节点集合。
 *
 * 勾中一个节点 ⇒ 它自身与整棵子树被选中，它到根的所有祖先被选中或半选；
 * 即 RuoYi-Vue3 `getMenuAllCheckedKeys()` 的 `getCheckedKeys() ∪ getHalfCheckedKeys()`。
 *
 * 后端 `SysRoleServiceImpl.insertRoleMenu` 原样入库、不补父节点，而
 * `SysMenuMapper.selectMenuTreeByUserId` 只返回 `sys_role_menu` 里有记录的菜单
 * （`SysMenuServiceImpl.getChildPerms` 从 parent_id=0 递归挂子节点），
 * 所以漏掉父节点会让整棵子树在侧边栏里消失。
 */
export function expandLinkedCheckedKeys(
  nodes: NzTreeNodeOptions[],
  checkedKeys: Iterable<string>,
): string[] {
  const picked = toKeySet(checkedKeys);
  const result = new Set<string>();
  const walk = (list: NzTreeNodeOptions[], ancestors: string[]): void => {
    for (const node of list) {
      const key = String(node.key);
      if (picked.has(key)) {
        ancestors.forEach((ancestor) => result.add(ancestor));
        collectSubtreeKeys(node, result);
      }
      if (node.children?.length) {
        walk(node.children, [...ancestors, key]);
      }
    }
  };
  walk(nodes, []);
  return [...result];
}

/** 把节点自身与所有后代的 key 收集进 result */
function collectSubtreeKeys(node: NzTreeNodeOptions, result: Set<string>): void {
  result.add(String(node.key));
  node.children?.forEach((child) => collectSubtreeKeys(child, result));
}

/** 树上是否「全部勾选」，用于让「全选/全不选」复选框与树的实际状态保持一致 */
export function isTreeFullyChecked(
  nodes: NzTreeNodeOptions[],
  checkedKeys: Iterable<string>,
): boolean {
  const all = collectTreeKeys(nodes);
  const picked = toKeySet(checkedKeys);
  return all.length > 0 && all.every((key) => picked.has(key));
}
