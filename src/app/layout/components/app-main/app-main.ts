import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * 内容区容器
 * 对应 ruoyi-vue3/src/layout/components/AppMain.vue
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-main',
  imports: [RouterOutlet],
  templateUrl: './app-main.html',
  styleUrl: './app-main.less',
})
export class AppMain {}
