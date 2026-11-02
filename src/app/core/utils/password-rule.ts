import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { cache } from './cache';

/** 密码字符范围规则 */
export interface PasswordCharacterRule {
  /** 字符范围正则 */
  pattern: RegExp;
  /** 不匹配时的提示文案 */
  message: string;
}

/**
 * 密码字符范围规则表
 * 对应 ruoyi-vue3/src/utils/passwordRule.js 的 PWD_RULES
 *
 * chrtype 取值（sys.account.chrtype）：
 *   0 任意字符（默认）、1 纯数字、2 纯字母、3 字母+数字、4 字母+数字+特殊字符
 */
export const PWD_RULES: Record<string, PasswordCharacterRule> = {
  '0': { pattern: /^[^<>"'|\\]+$/, message: '密码不能包含非法字符：< > " \' \\ |' },
  '1': { pattern: /^[0-9]+$/, message: '密码只能为数字（0-9）' },
  '2': { pattern: /^[a-zA-Z]+$/, message: '密码只能为英文字母（a-z、A-Z）' },
  '3': {
    pattern: /^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9]+$/,
    message: '密码必须同时包含字母和数字',
  },
  '4': {
    pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[~!@#$%^&*()\-=_+])[A-Za-z\d~!@#$%^&*()\-=_+]+$/,
    message: '密码必须同时包含字母、数字和特殊字符（~!@#$%^&*()-=_+）',
  },
};

/** 密码长度下限 */
export const PASSWORD_MIN_LENGTH = 6;
/** 密码长度上限 */
export const PASSWORD_MAX_LENGTH = 20;

/**
 * 当前生效的字符规则
 * chrtype 由 UserStore.getInfo 写入 session（取后端 getInfo 返回的 pwdChrtype），
 * 每次调用重新读取，避免模块加载顺序导致读到旧值
 */
export function currentPasswordRule(): PasswordCharacterRule {
  const chrType = cache.session.get('pwrChrtype') ?? '0';
  return PWD_RULES[chrType] ?? PWD_RULES['0'];
}

/**
 * 校验密码，返回首个错误提示，通过返回 null
 * 用于无法走表单校验器的场景（如 nz-modal 的输入框确认）
 */
export function validatePassword(value: string, label = '密码'): string | null {
  if (!value) {
    return `${label}不能为空`;
  }
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return `${label}长度必须介于 ${PASSWORD_MIN_LENGTH} 和 ${PASSWORD_MAX_LENGTH} 之间`;
  }
  const rule = currentPasswordRule();
  return rule.pattern.test(value) ? null : rule.message;
}

/**
 * 密码校验器（长度 + 字符范围）
 * 空值交给 Validators.required 处理，错误值本身即提示文案，
 * 模板中通过 control.errors?.['password'] 回显
 */
export function passwordValidator(label = '密码'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');
    if (!value) {
      return null;
    }
    const message = validatePassword(value, label);
    return message ? { password: message } : null;
  };
}
