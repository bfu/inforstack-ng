import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * 外链页面（以 iframe 方式嵌入）
 * 对应 ruoyi-vue3/src/layout/components/InnerLink
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-inner-link',
  template: `<iframe class="inner-link" [src]="safeUrl()" frameborder="0"></iframe>`,
  styles: [
    `
      .inner-link {
        display: block;
        width: 100%;
        height: calc(100vh - 74px);
        border: 0;
      }
    `,
  ],
})
export class InnerLink {
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly link = signal('');

  readonly safeUrl = computed(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.link()));

  constructor() {
    const data = this.route.snapshot.data;
    this.link.set((data['link'] as string) ?? '');
  }
}
