import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import type * as Monaco from 'monaco-editor';
import { MonacoApi, MonacoLoader } from '@core/monaco/monaco-loader';

/**
 * Monaco 编辑器封装
 *
 * 用法：
 * <app-monaco-editor [value]="xml()" language="xml" (valueChange)="xml.set($event)" />
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-monaco-editor',
  templateUrl: './monaco-editor.html',
  styleUrl: './monaco-editor.less',
})
export class MonacoEditorComponent implements AfterViewInit, OnDestroy {
  private readonly loader = inject(MonacoLoader);
  private readonly message = inject(NzMessageService);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  /** 编辑器语言，默认 xml */
  readonly language = input('xml');
  /** 编辑器内容 */
  readonly value = input('');
  /** 是否只读 */
  readonly readOnly = input(false);
  /** 编辑器高度 */
  readonly height = input('520px');

  /** 内容变化 */
  readonly valueChange = output<string>();

  private monaco?: MonacoApi;
  private editor?: Monaco.editor.IStandaloneCodeEditor;
  private disposed = false;

  constructor() {
    // 外部内容变化时同步进编辑器（避免与用户输入互相触发）
    effect(() => {
      const text = this.value() ?? '';
      if (this.editor && this.editor.getValue() !== text) {
        this.editor.setValue(text);
      }
    });
  }

  ngAfterViewInit(): void {
    void this.init();
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.editor?.dispose();
    this.editor = undefined;
  }

  /** 手动触发布局（容器尺寸变化时） */
  layout(): void {
    this.editor?.layout();
  }

  private async init(): Promise<void> {
    try {
      const monaco = await this.loader.load();
      if (this.disposed) {
        return;
      }
      this.monaco = monaco;
      this.editor = monaco.editor.create(this.host().nativeElement, {
        value: this.value() ?? '',
        language: this.language(),
        theme: 'vs',
        readOnly: this.readOnly(),
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        tabSize: 2,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        renderWhitespace: 'selection',
      });
      this.editor.onDidChangeModelContent(() => {
        if (this.editor) {
          this.valueChange.emit(this.editor.getValue());
        }
      });
    } catch (error) {
      this.message.error(error instanceof Error ? error.message : '编辑器加载失败');
    }
  }
}
