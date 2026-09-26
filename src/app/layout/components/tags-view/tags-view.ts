import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzMessageService } from 'ng-zorro-antd/message';
import { RuoYiReuseStrategy } from '@core/reuse-strategy';
import { TagsViewStore, VisitedView } from '@store/tags-view.store';

/**
 * 多页签栏
 * 对应 ruoyi-vue3/src/layout/components/TagsView/index.vue
 */
@Component({
  selector: 'app-tags-view',
  imports: [NzDropdownModule, NzIconModule, NzMenuModule],
  templateUrl: './tags-view.html',
  styleUrl: './tags-view.less',
})
export class TagsView {
  private readonly router = inject(Router);
  private readonly tags = inject(TagsViewStore);
  private readonly reuse = inject(RuoYiReuseStrategy);
  private readonly message = inject(NzMessageService);

  readonly views = this.tags.visitedViews;
  private readonly currentPath = signal('');

  readonly current = computed(() => this.views().find((view) => view.path === this.currentPath()) ?? null);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.sync());
  }

  private sync(): void {
    const path = this.router.url.split('?')[0];
    this.currentPath.set(path);
    this.tags.addView({ path, title: this.resolveTitle(), closable: path !== '/index' });
  }

  private resolveTitle(): string {
    let node: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    let title = '';
    while (node) {
      const current = node.data?.['title'] as string | undefined;
      if (current) {
        title = current;
      }
      node = node.firstChild ?? null;
    }
    return title || '未命名';
  }

  isActive(view: VisitedView): boolean {
    return view.path === this.currentPath();
  }

  go(view: VisitedView): void {
    if (this.currentPath() !== view.path) {
      void this.router.navigateByUrl(view.path);
    }
  }

  close(event: MouseEvent, view: VisitedView): void {
    event.stopPropagation();
    this.tags.delView(view);
    this.reuse.clear(view.path);
    if (this.currentPath() === view.path) {
      const last = this.views().slice(-1)[0];
      void this.router.navigateByUrl(last?.path ?? '/index');
    }
  }

  closeOthers(): void {
    const current = this.current();
    if (!current) {
      return;
    }
    this.views()
      .filter((view) => view.path !== current.path && view.closable)
      .forEach((view) => this.reuse.clear(view.path));
    this.tags.delOthersViews(current);
  }

  closeAll(): void {
    this.views()
      .filter((view) => view.closable)
      .forEach((view) => this.reuse.clear(view.path));
    this.tags.delAllViews();
    void this.router.navigateByUrl('/index');
  }

  /** 刷新当前页签：清除缓存后重新导航 */
  refresh(): void {
    const current = this.current();
    if (!current) {
      return;
    }
    this.reuse.clear(current.path);
    void this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      void this.router.navigateByUrl(current.path);
      this.message.success('已刷新');
    });
  }
}
