import { beforeEach, describe, expect, it } from 'vitest';
import { getToken, removeToken, setToken } from './auth';

describe('auth token 工具', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('无 Token 时返回空串', () => {
    expect(getToken()).toBe('');
  });

  it('写入后可读取', () => {
    setToken('abc-token');
    expect(getToken()).toBe('abc-token');
  });

  it('removeToken 清除后读取为空串', () => {
    setToken('abc-token');
    removeToken();
    expect(getToken()).toBe('');
    expect(localStorage.getItem('Admin-Token')).toBeNull();
  });
});
