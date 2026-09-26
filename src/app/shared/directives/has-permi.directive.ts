import { Directive, Input, effect, inject, signal } from '@angular/core';
import { TemplateRef, ViewContainerRef } from '@angular/core';
import { UserStore } from '../../store/user.store';

/**
 * 权限指令：按用户权限控制元素渲染
 * 用法：<button *appHasPermi="['system:user:add']">新增</button>
 * 对应 ruoyi-vue3 的 v-hasPermi
 */
@Directive({
  selector: '[appHasPermi]',
})
export class HasPermiDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly store = inject(UserStore);

  private readonly permissions = signal<string[]>([]);
  private readonly mode = signal<'or' | 'and'>('or');

  /** 需要的权限，支持单个或多个 */
  @Input({ required: true }) set appHasPermi(value: string | string[] | null) {
    this.permissions.set(Array.isArray(value) ? value : value ? [value] : []);
  }

  /** 多权限时的判定方式：or 任一满足（默认） / and 全部满足 */
  @Input() set appHasPermiMode(value: 'or' | 'and') {
    this.mode.set(value ?? 'or');
  }

  constructor() {
    effect(() => {
      const list = this.permissions();
      const mode = this.mode();
      const visible =
        list.length > 0 && (mode === 'and' ? list.every((p) => this.store.hasPermi(p)) : list.some((p) => this.store.hasPermi(p)));
      this.viewContainer.clear();
      if (visible) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}

/**
 * 角色指令：按用户角色控制元素渲染
 * 用法：<button *appHasRole="['admin']">删除</button>
 * 对应 ruoyi-vue3 的 v-hasRole
 */
@Directive({
  selector: '[appHasRole]',
})
export class HasRoleDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly store = inject(UserStore);

  private readonly roles = signal<string[]>([]);
  private readonly mode = signal<'or' | 'and'>('or');

  @Input({ required: true }) set appHasRole(value: string | string[] | null) {
    this.roles.set(Array.isArray(value) ? value : value ? [value] : []);
  }

  @Input() set appHasRoleMode(value: 'or' | 'and') {
    this.mode.set(value ?? 'or');
  }

  constructor() {
    effect(() => {
      const list = this.roles();
      const mode = this.mode();
      const visible =
        list.length > 0 && (mode === 'and' ? list.every((r) => this.store.hasRole(r)) : list.some((r) => this.store.hasRole(r)));
      this.viewContainer.clear();
      if (visible) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}
