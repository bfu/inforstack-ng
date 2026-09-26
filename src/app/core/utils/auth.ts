/**
 * Token 读写工具
 * 对应 ruoyi-vue3/src/utils/auth.js（改用 localStorage，避免引入 js-cookie）
 */
const TOKEN_KEY = 'Admin-Token';

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
