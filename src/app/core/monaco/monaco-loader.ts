import { Injectable } from '@angular/core';
import type * as Monaco from 'monaco-editor';

/** monaco 全局命名空间类型 */
export type MonacoApi = typeof Monaco;

/** monaco AMD require 的最小接口 */
interface MonacoAmdRequire {
  (modules: string[], onLoad: () => void): void;
  config(options: { paths: Record<string, string> }): void;
}

declare global {
  interface Window {
    require?: MonacoAmdRequire;
    monaco?: MonacoApi;
  }
}

/**
 * Monaco 编辑器加载器
 *
 * 采用官方 AMD loader 方案：`monaco-editor/min/vs` 由 angular.json 复制到
 * `assets/monaco/vs`，运行时注入 loader.js 后按需加载 `vs/editor/editor.main`。
 * 这样无需 esbuild 的 worker 配置，语言高亮与 worker 均由 AMD loader 自行处理。
 */
@Injectable({ providedIn: 'root' })
export class MonacoLoader {
  private loading?: Promise<MonacoApi>;

  /** 按需加载并返回 monaco 命名空间 */
  load(): Promise<MonacoApi> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Monaco 仅支持浏览器环境'));
    }
    if (window.monaco) {
      return Promise.resolve(window.monaco);
    }
    if (!this.loading) {
      this.loading = this.bootstrap();
    }
    return this.loading;
  }

  private bootstrap(): Promise<MonacoApi> {
    const base = `${document.baseURI.replace(/\/+$/, '')}/assets/monaco/vs`;
    return this.injectLoader(base)
      .then(() => this.loadEditorMain(base))
      .catch((error: unknown) => {
        // 失败后允许重试
        this.loading = undefined;
        throw error;
      });
  }

  private injectLoader(base: string): Promise<void> {
    if (window.require) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `${base}/loader.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Monaco loader.js 加载失败'));
      document.body.appendChild(script);
    });
  }

  private loadEditorMain(base: string): Promise<MonacoApi> {
    return new Promise<MonacoApi>((resolve, reject) => {
      const requireFn = window.require;
      if (!requireFn) {
        reject(new Error('Monaco AMD require 不可用'));
        return;
      }
      requireFn.config({ paths: { vs: base } });
      requireFn(['vs/editor/editor.main'], () => {
        if (window.monaco) {
          resolve(window.monaco);
        } else {
          reject(new Error('Monaco editor.main 加载失败'));
        }
      });
    });
  }
}
