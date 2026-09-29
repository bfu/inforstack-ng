import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { UserStore } from '@store/user.store';
import { Index } from './index';

describe('Index 首页', () => {
  function create(roles: string[]): Index {
    TestBed.configureTestingModule({
      providers: [{ provide: UserStore, useValue: { roles: signal(roles) } }],
    });
    return TestBed.createComponent(Index).componentInstance;
  }

  it('角色文本为角色列表拼接', () => {
    const page = create(['admin', 'common']);
    expect(page.roleText()).toBe('admin、common');
  });

  it('无角色时显示占位符', () => {
    const page = create([]);
    expect(page.roleText()).toBe('—');
  });

  it('快捷入口包含核心管理页', () => {
    const page = create(['admin']);
    const paths = page.quickEntries.map((entry) => entry.path);
    expect(paths).toContain('/system/user');
    expect(paths).toContain('/system/role');
    expect(paths).toContain('/system/menu');
    expect(page.quickEntries.length).toBeGreaterThan(4);
  });

  it('today 为格式化日期', () => {
    const page = create(['admin']);
    expect(page.today).toMatch(/^\d{4}年\d{2}月\d{2}日$/);
  });
});
