import { describe, expect, it } from 'vitest';
import { NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { TreeSelectNode } from '@core/models/result';
import {
  collectRootKeys,
  collectTreeKeys,
  expandLinkedCheckedKeys,
  isTreeFullyChecked,
  splitBackfillKeys,
  toTreeNodes,
  toTreeSelectNodes,
  withCheckedKeys,
  withExpandedKeys,
} from './tree.util';

/**
 * 菜单树夹具（父子层级与真实 sys_menu 一致）：
 * 1 系统管理 ├ 100 角色管理 ├ 1001 角色查询 / 1002 角色新增
 *          └ 200 菜单管理 └ 2001 菜单查询
 */
const menuTree: TreeSelectNode[] = [
  {
    id: 1,
    label: '系统管理',
    children: [
      {
        id: 100,
        label: '角色管理',
        children: [
          { id: 1001, label: '角色查询' },
          { id: 1002, label: '角色新增' },
        ],
      },
      { id: 200, label: '菜单管理', children: [{ id: 2001, label: '菜单查询' }] },
    ],
  },
];

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

describe('collectTreeKeys', () => {
  it('按深度优先收集全部节点 key', () => {
    expect(collectTreeKeys(toTreeNodes(menuTree))).toEqual([
      '1',
      '100',
      '1001',
      '1002',
      '200',
      '2001',
    ]);
  });

  it('空树返回空数组', () => {
    expect(collectTreeKeys([])).toEqual([]);
  });
});

describe('withCheckedKeys', () => {
  it('命中集合的节点 checked=true，其余为 false', () => {
    const nodes = withCheckedKeys(toTreeNodes(menuTree), ['1001']);

    expect(nodes[0].checked).toBe(false);
    expect(nodes[0].children?.[0].checked).toBe(false);
    expect(nodes[0].children?.[0].children?.[0].checked).toBe(true);
    expect(nodes[0].children?.[0].children?.[1].checked).toBe(false);
  });

  it('不修改入参节点（返回新对象）', () => {
    const source = toTreeNodes(menuTree);
    const nodes = withCheckedKeys(source, ['1']);

    expect(source[0].checked).toBeUndefined();
    expect(nodes[0].checked).toBe(true);
  });
});

describe('splitBackfillKeys', () => {
  const nodes = toTreeNodes(menuTree);

  it('联动模式：叶子键可回填', () => {
    expect(splitBackfillKeys(nodes, ['1001', '2001'], true)).toEqual({
      fillable: ['1001', '2001'],
      carried: [],
    });
  });

  it('联动模式：非叶子键只能提交时原样带上（否则会连带勾选整棵子树）', () => {
    expect(splitBackfillKeys(nodes, ['100'], true)).toEqual({
      fillable: [],
      carried: ['100'],
    });
  });

  it('联动模式：叶子与非叶子混排时分别归类', () => {
    expect(splitBackfillKeys(nodes, ['1001', '200'], true)).toEqual({
      fillable: ['1001'],
      carried: ['200'],
    });
  });

  it('不联动模式：所有键都可回填（无向下传播）', () => {
    expect(splitBackfillKeys(nodes, ['100', '1001'], false)).toEqual({
      fillable: ['100', '1001'],
      carried: [],
    });
  });

  it('树上不存在的键归入 carried，避免保存时被静默删除', () => {
    expect(splitBackfillKeys(nodes, ['999'], true)).toEqual({
      fillable: [],
      carried: ['999'],
    });
  });

  it('空树时全部键归入 carried', () => {
    expect(splitBackfillKeys([], ['1', '2'], true)).toEqual({
      fillable: [],
      carried: ['1', '2'],
    });
  });
});

describe('collectRootKeys', () => {
  it('只取根级节点的 key（展开/折叠只作用于根级）', () => {
    expect(collectRootKeys(toTreeNodes(menuTree))).toEqual(['1']);
  });

  it('多根时按顺序返回', () => {
    const nodes = toTreeNodes([
      { id: 1, label: 'a', children: [{ id: 11, label: 'a1' }] },
      { id: 2, label: 'b' },
    ]);
    expect(collectRootKeys(nodes)).toEqual(['1', '2']);
  });

  it('空树返回空数组', () => {
    expect(collectRootKeys([])).toEqual([]);
  });
});

describe('withExpandedKeys', () => {
  it('命中集合的节点 expanded=true，其余为 false', () => {
    const nodes = withExpandedKeys(toTreeNodes(menuTree), ['1']);

    expect(nodes[0].expanded).toBe(true);
    expect(nodes[0].children?.[0].expanded).toBe(false);
    expect(nodes[0].children?.[0].children?.[0].expanded).toBe(false);
  });

  it('传空集合即「全部折叠」（ng-zorro 只能靠重建 nzData 折叠）', () => {
    const nodes = withExpandedKeys(toTreeNodes(menuTree), []);

    expect(nodes[0].expanded).toBe(false);
    expect(nodes[0].children?.[0].expanded).toBe(false);
  });

  it('不修改入参节点（返回新对象）', () => {
    const source = toTreeNodes(menuTree);
    const nodes = withExpandedKeys(source, ['1']);

    expect(source[0].expanded).toBeUndefined();
    expect(nodes[0].expanded).toBe(true);
  });
});

describe('isTreeFullyChecked', () => {
  const nodes = toTreeNodes(menuTree);

  it('全部 key 都在勾选集合里才算全选', () => {
    expect(isTreeFullyChecked(nodes, collectTreeKeys(nodes))).toBe(true);
  });

  it('少一个节点即不算全选', () => {
    expect(isTreeFullyChecked(nodes, ['1', '100', '1001', '1002', '200'])).toBe(false);
  });

  it('空树不算全选（避免「无节点」被当成「全选」）', () => {
    expect(isTreeFullyChecked([], [])).toBe(false);
  });
});

describe('expandLinkedCheckedKeys', () => {
  const nodes = toTreeNodes(menuTree);

  it('勾选叶子时补上其全部祖先（= 半选父节点）', () => {
    expect(expandLinkedCheckedKeys(nodes, ['1001'])).toEqual(['1', '100', '1001']);
  });

  it('勾选非叶子时连带整棵子树与祖先', () => {
    expect(expandLinkedCheckedKeys(nodes, ['100'])).toEqual(['1', '100', '1001', '1002']);
  });

  it('多分支同时勾选时取并集', () => {
    expect(expandLinkedCheckedKeys(nodes, ['1001', '2001'])).toEqual([
      '1',
      '100',
      '1001',
      '200',
      '2001',
    ]);
  });

  it('未勾选任何节点时返回空数组', () => {
    expect(expandLinkedCheckedKeys(nodes, [])).toEqual([]);
  });
});
