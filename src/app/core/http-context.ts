import { HttpContextToken } from '@angular/common/http';

/**
 * 请求级开关。
 * ruoyi-vue3 通过自定义 headers（isToken / repeatSubmit）控制，
 * Angular 中改用 HttpContext 传递，避免污染真实请求头。
 */

/** 是否跳过 Token 注入（登录、验证码、注册等接口） */
export const SKIP_TOKEN = new HttpContextToken<boolean>(() => false);

/** 是否跳过防重复提交校验（登录接口等） */
export const NO_REPEAT_SUBMIT = new HttpContextToken<boolean>(() => false);

/** 单独指定超时时间（毫秒） */
export const REQUEST_TIMEOUT = new HttpContextToken<number | null>(() => null);

/** 响应是否为文件流（下载、导出） */
export const RESPONSE_BLOB = new HttpContextToken<boolean>(() => false);
