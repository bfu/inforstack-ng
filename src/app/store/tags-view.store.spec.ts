import { describe, expect, it } from 'vitest';
import { TagsViewStore, VisitedView } from './tags-view.store';

describe('TagsViewStore', () => {
  function makeStore(): TagsViewStore {
    return new TagsViewStore();
  }

  const home: VisitedView = { path: '/index', title: '首页', closable: false };
  const user: VisitedView = { path: '/system/user', title: '用户管理', closable: true };
  const role: VisitedView = { path: '/system/role', title: '角色管理', closable: true };

  it('addView 追加页签', () => {
    const store = makeStore();
    store.addView(home);
    store.addView(user);

    expect(store.visitedViews()).toEqual([home, user]);
  });

  it('重复路径不追加，仅更新标题', () => {
    const store = makeStore();
    store.addView(user);
    store.addView({ ...user, title: '新标题' });

    expect(store.visitedViews()).toHaveLength(1);
    expect(store.visitedViews()[0].title).toBe('新标题');
  });

  it('updateTitle 更新指定页签标题', () => {
    const store = makeStore();
    store.addView(home);
    store.addView(user);
    store.updateTitle(user.path, '改名');

    expect(store.visitedViews()[1].title).toBe('改名');
    expect(store.visitedViews()[0].title).toBe('首页');
  });

  it('delView 删除指定页签', () => {
    const store = makeStore();
    store.addView(home);
    store.addView(user);
    store.delView(user);

    expect(store.visitedViews()).toEqual([home]);
  });

  it('delOthersViews 保留目标与不可关闭页签', () => {
    const store = makeStore();
    store.addView(home);
    store.addView(user);
    store.addView(role);
    store.delOthersViews(user);

    expect(store.visitedViews()).toEqual([home, user]);
  });

  it('delAllViews 仅保留不可关闭页签', () => {
    const store = makeStore();
    store.addView(home);
    store.addView(user);
    store.addView(role);
    store.delAllViews();

    expect(store.visitedViews()).toEqual([home]);
  });

  it('reset 清空全部（含固定页签）', () => {
    const store = makeStore();
    store.addView(home);
    store.addView(user);
    store.reset();

    expect(store.visitedViews()).toEqual([]);
  });
});
