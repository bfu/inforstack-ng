import { DestroyRef, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DictStore } from '@store/dict.store';
import { selectDictLabels } from '@core/utils/ruoyi';

/**
 * 字典标签翻译管道
 * 用法：{{ value | dict: 'sys_user_sex' }}
 *
 * 说明：字典为异步加载，管道声明为 impure，
 * 以便在字典数据到达后随变更检测刷新
 */
@Pipe({
  name: 'dict',
  pure: false,
})
export class DictPipe implements PipeTransform {
  private readonly dictStore = inject(DictStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loaded = signal<Record<string, boolean>>({});

  transform(value: unknown, dictType: string): string {
    const raw = value === null || value === undefined ? '' : String(value);
    if (!dictType) {
      return raw;
    }
    this.ensureLoaded(dictType);
    const items = this.dictStore.getDict(dictType);
    if (!items) {
      return raw;
    }
    return selectDictLabels(items, value);
  }

  private ensureLoaded(dictType: string): void {
    if (this.loaded()[dictType] || this.dictStore.getDict(dictType)) {
      return;
    }
    this.loaded.update((state) => ({ ...state, [dictType]: true }));
    this.dictStore.loadDict(dictType).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
}
