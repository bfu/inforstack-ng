import { describe, expect, it } from 'vitest';
import { ERROR_CODE, resolveErrorMessage } from './error-code';

describe('resolveErrorMessage 错误码映射', () => {
  it('已知错误码返回映射文案', () => {
    expect(resolveErrorMessage(401)).toBe(ERROR_CODE['401']);
    expect(resolveErrorMessage('403')).toBe(ERROR_CODE['403']);
    expect(resolveErrorMessage(404)).toBe(ERROR_CODE['404']);
  });

  it('数字与字符串形式的错误码等价', () => {
    expect(resolveErrorMessage(401)).toBe(resolveErrorMessage('401'));
  });

  it('未知错误码优先使用后端 msg', () => {
    expect(resolveErrorMessage(500, '后端返回的提示')).toBe('后端返回的提示');
  });

  it('未知错误码且无 msg 时使用默认文案', () => {
    expect(resolveErrorMessage(999)).toBe(ERROR_CODE['default']);
    expect(resolveErrorMessage(999, undefined)).toBe(ERROR_CODE['default']);
  });
});
