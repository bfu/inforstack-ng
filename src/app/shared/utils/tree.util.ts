import { NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { TreeSelectNode } from '../../core/models/result';

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
