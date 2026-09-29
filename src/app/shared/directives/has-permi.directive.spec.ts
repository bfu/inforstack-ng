import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { HasPermiDirective, HasRoleDirective } from './has-permi.directive';
import { UserStore } from '@store/user.store';

@Component({
  selector: 'app-or-host',
  imports: [HasPermiDirective],
  template: `<button *appHasPermi="perms; mode: 'or'">SECRET</button>`,
})
class OrHost {
  perms: string | string[] | null = ['system:user:add'];
}

@Component({
  selector: 'app-and-host',
  imports: [HasPermiDirective],
  template: `<button *appHasPermi="perms; mode: 'and'">SECRET</button>`,
})
class AndHost {
  perms: string | string[] | null = ['a:b:c', 'x:y:z'];
}

@Component({
  selector: 'app-role-or-host',
  imports: [HasRoleDirective],
  template: `<button *appHasRole="roles; mode: 'or'">SECRET</button>`,
})
class RoleOrHost {
  roles: string | string[] | null = ['admin'];
}

@Component({
  selector: 'app-role-and-host',
  imports: [HasRoleDirective],
  template: `<button *appHasRole="roles; mode: 'and'">SECRET</button>`,
})
class RoleAndHost {
  roles: string | string[] | null = ['admin', 'common'];
}

describe('HasPermiDirective', () => {
  let hasPermi: ReturnType<typeof vi.fn>;

  function setup(allowed: string[] = []): void {
    hasPermi = vi.fn((p: string) => allowed.includes(p));
    TestBed.configureTestingModule({
      imports: [OrHost, AndHost],
      providers: [{ provide: UserStore, useValue: { hasPermi, hasRole: vi.fn() } }],
    });
  }

  it('拥有权限时渲染元素', async () => {
    setup(['system:user:add']);
    const fixture = TestBed.createComponent(OrHost);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('SECRET');
  });

  it('无权限时移除元素', async () => {
    setup([]);
    const fixture = TestBed.createComponent(OrHost);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('SECRET');
  });

  it('or 模式：任一权限满足即渲染', async () => {
    setup(['x:y:z']);
    const fixture = TestBed.createComponent(OrHost);
    fixture.componentInstance.perms = ['a:b:c', 'x:y:z'];
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('SECRET');
  });

  it('and 模式：全部满足才渲染，部分满足不渲染', async () => {
    setup(['a:b:c']);
    const fixture = TestBed.createComponent(AndHost);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('SECRET');

    TestBed.resetTestingModule();
    setup(['a:b:c', 'x:y:z']);
    const ok = TestBed.createComponent(AndHost);
    await ok.whenStable();
    expect(ok.nativeElement.textContent).toContain('SECRET');
  });

  it('权限列表为空或 null 时不渲染', async () => {
    setup(['anything']);
    const fixture = TestBed.createComponent(OrHost);
    fixture.componentInstance.perms = [];
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('SECRET');

    fixture.componentInstance.perms = null;
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).not.toContain('SECRET');
  });
});

describe('HasRoleDirective', () => {
  let hasRole: ReturnType<typeof vi.fn>;

  function setup(allowed: string[] = []): void {
    hasRole = vi.fn((r: string) => allowed.includes(r));
    TestBed.configureTestingModule({
      imports: [RoleOrHost, RoleAndHost],
      providers: [{ provide: UserStore, useValue: { hasPermi: vi.fn(), hasRole } }],
    });
  }

  it('拥有角色时渲染元素', async () => {
    setup(['admin']);
    const fixture = TestBed.createComponent(RoleOrHost);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('SECRET');
  });

  it('无角色时移除元素', async () => {
    setup([]);
    const fixture = TestBed.createComponent(RoleOrHost);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('SECRET');
  });

  it('and 模式：全部角色满足才渲染', async () => {
    setup(['admin']);
    const fixture = TestBed.createComponent(RoleAndHost);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('SECRET');

    TestBed.resetTestingModule();
    setup(['admin', 'common']);
    const ok = TestBed.createComponent(RoleAndHost);
    await ok.whenStable();
    expect(ok.nativeElement.textContent).toContain('SECRET');
  });
});
