import { describe, expect, it } from 'vitest';
import { isEmpty, isExternal, isHttp, isPathMatch, validEmail, validURL } from './validate';

describe('isPathMatch 路径通配', () => {
  it('精确匹配', () => {
    expect(isPathMatch('/system/user', '/system/user')).toBe(true);
    expect(isPathMatch('/system/user', '/system/role')).toBe(false);
  });

  it('单星号匹配一段（不含斜杠）', () => {
    expect(isPathMatch('/system/*', '/system/user')).toBe(true);
    expect(isPathMatch('/system/*', '/system/user/profile')).toBe(false);
  });

  it('双星号跨段匹配', () => {
    expect(isPathMatch('/**', '/system/user/profile')).toBe(true);
    expect(isPathMatch('/system/**', '/system/user/profile')).toBe(true);
    expect(isPathMatch('/system/**', '/monitor/user')).toBe(false);
  });

  it('正则元字符被转义', () => {
    expect(isPathMatch('/a.b', '/axb')).toBe(false);
    expect(isPathMatch('/a.b', '/a.b')).toBe(true);
  });
});

describe('isEmpty', () => {
  it('null / undefined / 空串 / "undefined" 视为空', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty('')).toBe(true);
    expect(isEmpty('undefined')).toBe(true);
  });

  it('非空字符串与 0 不为空', () => {
    expect(isEmpty('a')).toBe(false);
    expect(isEmpty(0)).toBe(false);
  });
});

describe('isHttp / isExternal', () => {
  it('识别 http 与 https', () => {
    expect(isHttp('https://a.com')).toBe(true);
    expect(isHttp('http://a.com')).toBe(true);
    expect(isHttp('/dev-api/login')).toBe(false);
  });

  it('识别外链（http / mailto / tel）', () => {
    expect(isExternal('https://a.com')).toBe(true);
    expect(isExternal('mailto:a@b.com')).toBe(true);
    expect(isExternal('tel:123')).toBe(true);
    expect(isExternal('/system/user')).toBe(false);
  });
});

describe('validURL / validEmail', () => {
  it('合法与非法 URL', () => {
    expect(validURL('https://www.example.com/path?x=1')).toBe(true);
    expect(validURL('not a url')).toBe(false);
  });

  it('合法与非法邮箱', () => {
    expect(validEmail('user@example.com')).toBe(true);
    expect(validEmail('user@')).toBe(false);
    expect(validEmail('user@example')).toBe(false);
  });
});
