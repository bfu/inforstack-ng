import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { NotFound } from './not-found';

describe('NotFound 404 页', () => {
  it('渲染 404 结果页与返回首页链接', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(NotFound);
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('404');
  });
});
