import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';
import { DictDataApi } from '@api/system/dict/data';

export interface DictItem {
  label: string;
  value: string;
  /** 回显样式（对应后端 listClass） */
  listClass?: string;
  cssClass?: string;
}

/**
 * 字典缓存
 * 对应 ruoyi-vue3/src/store/modules/dict.js
 */
@Injectable({ providedIn: 'root' })
export class DictStore {
  private readonly api = inject(DictDataApi);

  private readonly _dicts = signal<Record<string, DictItem[]>>({});
  /** 进行中的请求，避免并发重复拉取 */
  private readonly pending = new Map<string, Observable<DictItem[]>>();

  readonly dicts = this._dicts.asReadonly();

  getDict(dictType: string): DictItem[] | null {
    if (!dictType) {
      return null;
    }
    return this._dicts()[dictType] ?? null;
  }

  /** 加载字典（命中缓存直接返回） */
  loadDict(dictType: string): Observable<DictItem[]> {
    const cached = this.getDict(dictType);
    if (cached) {
      return of(cached);
    }
    const inflight = this.pending.get(dictType);
    if (inflight) {
      return inflight;
    }
    const request$ = this.api.getDicts(dictType).pipe(
      map((res) =>
        (res.data ?? []).map((item) => ({
          label: item.dictLabel ?? '',
          value: item.dictValue ?? '',
          listClass: item.listClass ?? undefined,
          cssClass: item.cssClass ?? undefined,
        })),
      ),
      tap((items) => {
        this.setDict(dictType, items);
        this.pending.delete(dictType);
      }),
      catchError((err) => {
        this.pending.delete(dictType);
        return throwError(() => err);
      }),
      shareReplay(1),
    );
    this.pending.set(dictType, request$);
    return request$;
  }

  setDict(dictType: string, items: DictItem[]): void {
    if (!dictType) {
      return;
    }
    this._dicts.update((dicts) => ({ ...dicts, [dictType]: items }));
  }

  removeDict(dictType: string): void {
    this._dicts.update((dicts) => {
      const next = { ...dicts };
      delete next[dictType];
      return next;
    });
  }

  cleanDict(): void {
    this._dicts.set({});
    this.pending.clear();
  }
}
