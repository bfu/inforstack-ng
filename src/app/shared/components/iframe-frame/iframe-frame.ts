import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * 通用内嵌页面（iframe）
 * 供外链、监控、接口文档等页面复用，避免每个页面各写一份 iframe + 样式
 */
@Component({
  selector: 'app-iframe-frame',
  template: `<iframe class="iframe-frame" [src]="safeUrl()" frameborder="0"></iframe>`,
  styles: [
    `
      .iframe-frame {
        display: block;
        width: 100%;
        height: calc(100vh - 74px);
        border: 0;
      }
    `,
  ],
})
export class IframeFrame {
  private readonly sanitizer = inject(DomSanitizer);

  /** 内嵌地址，相对径需由调用方拼接完整 URL */
  readonly src = input.required<string>();

  readonly safeUrl = computed(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.src()));
}
