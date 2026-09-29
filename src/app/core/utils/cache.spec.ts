import { beforeEach, describe, expect, it } from 'vitest';
import { cache } from './cache';

describe('cache 缓存封装', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('set / get', () => {
    it('字符串读写往返', () => {
      cache.session.set('k', 'v');
      expect(cache.session.get('k')).toBe('v');
    });

    it('key 为 null 时不写入、读取返回 null', () => {
      cache.session.set(null as unknown as string, 'v');
      expect(cache.session.get(null as unknown as string)).toBeNull();
    });

    it('value 为 null 时不写入', () => {
      cache.local.set('k', null as unknown as string);
      expect(cache.local.get('k')).toBeNull();
    });
  });

  describe('setJSON / getJSON', () => {
    it('对象读写往返', () => {
      cache.session.setJSON('k', { a: 1, b: 'x' });
      expect(cache.session.getJSON<{ a: number; b: string }>('k')).toEqual({ a: 1, b: 'x' });
    });

    it('非法 JSON 返回 null 而非抛错', () => {
      sessionStorage.setItem('k', '{invalid json');
      expect(cache.session.getJSON('k')).toBeNull();
    });

    it('value 为 null 时不写入', () => {
      cache.session.setJSON('k', null);
      expect(cache.session.getJSON('k')).toBeNull();
    });
  });

  it('session 与 local 相互隔离', () => {
    cache.session.set('k', 'session-value');
    cache.local.set('k', 'local-value');
    expect(cache.session.get('k')).toBe('session-value');
    expect(cache.local.get('k')).toBe('local-value');
  });

  it('remove 删除指定 key', () => {
    cache.local.set('k', 'v');
    cache.local.remove('k');
    expect(cache.local.get('k')).toBeNull();
  });
});
