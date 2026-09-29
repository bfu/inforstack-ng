import { describe, expect, it } from 'vitest';
import { NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { TreeSelectNode } from '@core/models/result';
import { toTreeNodes, toTreeSelectNodes } from './tree.util';

describe('toTreeNodes', () => {
  it('映射 label→title、id→key（字符串化）', () => {
    const nodes: TreeSelectNode[] = [{ id: 1, label: '研发部门' }];
    expect(toTreeNodes(nodes)).toEqual<NzTreeNodeOptions[]>([
      { title: '研发部门', key: '1', isLeaf: true, children: undefined },
    ]);
  });

  it('有子节点时递归映射且 isLeaf 为 false', () => {
    const nodes: TreeSelectNode[] = [
      {
        id: 1,
        label: '总公司',
        children: [{ id: 11, label: '子公司' }],
      },
    ];
    expect(toTreeNodes(nodes)).toEqual<NzTreeNodeOptions[]>([
      {
        title: '总公司',
        key: '1',
        isLeaf: false,
        children: [{ title: '子公司', key: '11', isLeaf: true, children: undefined }],
      },
    ]);
  });

  it('空 children 数组视为叶子（children 为 undefined）', () => {
    const nodes: TreeSelectNode[] = [{ id: 1, label: 'a', children: [] }];
    expect(toTreeNodes(nodes)).toEqual([
      { title: 'a', key: '1', isLeaf: true, children: undefined },
    ]);
  });

  it('空数组输入返回空数组', () => {
    expect(toTreeNodes([])).toEqual([]);
  });
});

describe('toTreeSelectNodes', () => {
  it('与 toTreeNodes 行为一致', () => {
    const nodes: TreeSelectNode[] = [{ id: 1, label: 'a', children: [{ id: 2, label: 'b' }] }];
    expect(toTreeSelectNodes(nodes)).toEqual(toTreeNodes(nodes));
  });
});
