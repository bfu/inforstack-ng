import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { IframeFrame } from './iframe-frame';

@Component({
  selector: 'app-iframe-host',
  imports: [IframeFrame],
  template: `<app-iframe-frame [src]="src()" />`,
})
class Host {
  readonly src = input('https://example.com/doc');
}

describe('IframeFrame', () => {
  function setup(): void {
    TestBed.configureTestingModule({ imports: [Host] });
  }

  it('渲染 iframe 并绑定 src', async () => {
    setup();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    const iframe = fixture.nativeElement.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('src')).toBe('https://example.com/doc');
    expect(iframe.getAttribute('frameborder')).toBe('0');
  });

  it('src 变更后更新绑定', async () => {
    setup();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    fixture.componentRef.setInput('src', 'https://other.com');
    await fixture.whenStable();

    const iframe = fixture.nativeElement.querySelector('iframe');
    expect(iframe.getAttribute('src')).toBe('https://other.com');
  });
});
