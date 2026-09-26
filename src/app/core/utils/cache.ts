/**
 * 会话级 / 本地级缓存封装
 * 对应 ruoyi-vue3/src/plugins/cache.js
 */
class Cache {
  constructor(private readonly storage: Storage) {}

  set(key: string, value: string): void {
    if (key != null && value != null) {
      this.storage.setItem(key, value);
    }
  }

  get(key: string): string | null {
    if (key == null) {
      return null;
    }
    return this.storage.getItem(key);
  }

  setJSON(key: string, jsonValue: unknown): void {
    if (jsonValue != null) {
      this.set(key, JSON.stringify(jsonValue));
    }
  }

  getJSON<T>(key: string): T | null {
    const value = this.get(key);
    if (value != null) {
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    }
    return null;
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }
}

export const cache = {
  /** 会话级缓存 */
  session: new Cache(sessionStorage),
  /** 本地缓存 */
  local: new Cache(localStorage),
};
