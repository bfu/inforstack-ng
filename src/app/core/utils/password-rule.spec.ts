import { FormControl } from '@angular/forms';
import { afterEach, describe, expect, it } from 'vitest';
import { cache } from './cache';
import { passwordValidator, validatePassword } from './password-rule';

describe('password-rule 密码规则', () => {
  afterEach(() => cache.session.remove('pwrChrtype'));

  it('未配置 chrtype 时按任意字符规则，仅拦截非法字符', () => {
    expect(validatePassword('abc123')).toBeNull();
    expect(validatePassword('abc<123')).toBe('密码不能包含非法字符：< > " \' \\ |');
  });

  it('chrtype=1 只允许数字', () => {
    cache.session.set('pwrChrtype', '1');

    expect(validatePassword('123456')).toBeNull();
    expect(validatePassword('abc123')).toBe('密码只能为数字（0-9）');
  });

  it('chrtype=3 必须同时包含字母和数字', () => {
    cache.session.set('pwrChrtype', '3');

    expect(validatePassword('abc123')).toBeNull();
    expect(validatePassword('123456')).toBe('密码必须同时包含字母和数字');
  });

  it('长度必须在 6 到 20 之间', () => {
    expect(validatePassword('12345', '新密码')).toBe('新密码长度必须介于 6 和 20 之间');
    expect(validatePassword('1'.repeat(21), '新密码')).toBe('新密码长度必须介于 6 和 20 之间');
  });

  it('空值返回必填提示', () => {
    expect(validatePassword('')).toBe('密码不能为空');
  });

  it('passwordValidator 空值交给 required，错误值即提示文案', () => {
    const control = new FormControl('', [passwordValidator('新密码')]);
    expect(control.errors).toBeNull();

    control.setValue('123');
    expect(control.errors?.['password']).toBe('新密码长度必须介于 6 和 20 之间');

    control.setValue('123456');
    expect(control.errors).toBeNull();
  });
});
