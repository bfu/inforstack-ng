import { Injectable, signal } from '@angular/core';

export interface VisitedView {
  /** 页面路径（不含查询参数） */
  path: string;
  /** 页签标题 */
  title: string;
  /** 是否可关闭（首页固定不可关闭） */
  closable: boolean;
}

/**
 * 多页签状态存储
 * 对应 ruoyi-vue3/src/store/modules/tagsView.js
 */
@Injectable({ providedIn: 'root' })
export class TagsViewStore {
  private readonly _visitedViews = signal<VisitedView[]>([]);

  readonly visitedViews = this._visitedViews.asReadonly();

  addView(view: VisitedView): void {
    const exists = this._visitedViews().some((item) => item.path === view.path);
    if (exists) {
      this.updateTitle(view.path, view.title);
      return;
    }
    this._visitedViews.update((views) => [...views, view]);
  }

  updateTitle(path: string, title: string): void {
    this._visitedViews.update((views) =>
      views.map((item) => (item.path === path ? { ...item, title } : item)),
    );
  }

  delView(view: VisitedView): void {
    this._visitedViews.update((views) => views.filter((item) => item.path !== view.path));
  }

  delOthersViews(view: VisitedView): void {
    this._visitedViews.update((views) =>
      views.filter((item) => item.path === view.path || !item.closable),
    );
  }

  delAllViews(): void {
    this._visitedViews.update((views) => views.filter((item) => !item.closable));
  }

  reset(): void {
    this._visitedViews.set([]);
  }
}
