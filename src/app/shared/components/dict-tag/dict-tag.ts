import { Component, DestroyRef, OnInit, computed, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { DictStore } from '../../../store/dict.store';
import { selectDictLabels } from '../../../core/utils/ruoyi';

/** 后端 listClass → ng-zorro 标签颜色 */
const TAG_COLOR: Record<string, string> = {
  default: '',
  primary: 'blue',
  success: 'green',
  info: 'cyan',
  warning: 'orange',
  danger: 'red',
};

/**
 * 字典标签组件：根据字典类型回显标签文本与颜色
 * 用法：<app-dict-tag [value]="row.status" dictType="sys_normal_disable" />
 */
@Component({
  selector: 'app-dict-tag',
  imports: [NzTagModule],
  template: `<nz-tag [nzColor]="color()">{{ text() }}</nz-tag>`,
})
export class DictTag implements OnInit {
  private readonly dictStore = inject(DictStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input.required<unknown>();
  readonly dictType = input.required<string>();

  readonly text = computed(() => {
    const items = this.dictStore.getDict(this.dictType());
    if (!items) {
      return this.rawText();
    }
    return selectDictLabels(items, this.value());
  });

  readonly color = computed(() => {
    const items = this.dictStore.getDict(this.dictType());
    const matched = items?.find((item) => item.value === String(this.value()));
    return TAG_COLOR[matched?.listClass ?? 'default'] ?? '';
  });

  private rawText(): string {
    const value = this.value();
    return value === null || value === undefined ? '' : String(value);
  }

  ngOnInit(): void {
    if (!this.dictStore.getDict(this.dictType())) {
      this.dictStore
        .loadDict(this.dictType())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }
}
