import { Component } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { IframeFrame } from '../../../shared/components/iframe-frame/iframe-frame';

/**
 * 数据监控（Druid），对应 ruoyi-vue3/src/views/monitor/druid/index.vue
 * 后端 application-druid.yml 已开启 stat-view-servlet，url-pattern 为 /druid/*
 */
@Component({
  selector: 'app-druid-page',
  imports: [IframeFrame],
  template: `<app-iframe-frame [src]="url" />`,
})
export class DruidPage {
  readonly url = `${environment.apiBaseUrl}/druid/login.html`;
}
