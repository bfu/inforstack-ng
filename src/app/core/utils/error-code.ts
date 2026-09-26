/**
 * 业务错误码 → 中文提示映射
 * 对应 ruoyi-vue3/src/utils/errorCode.js
 */
export const ERROR_CODE: Record<string, string> = {
  '401': '认证失败，无法访问系统资源',
  '403': '当前操作没有权限',
  '404': '访问资源不存在',
  default: '系统未知错误，请反馈给管理员',
};

export function resolveErrorMessage(code: number | string, msg?: string): string {
  return ERROR_CODE[String(code)] ?? msg ?? ERROR_CODE['default'];
}
