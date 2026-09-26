import { Component } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { IframeFrame } from '../../../shared/components/iframe-frame/iframe-frame';

/**
 * 系统接口（Swagger），对应 ruoyi-vue3/src/views/tool/swagger/index.vue
 * 后端引入 springdoc-openapi-starter-webmvc-ui，默认地址为 /swagger-ui/index.html
 */
@Component({
  selector: 'app-swagger-page',
  imports: [IframeFrame],
  template: `<app-iframe-frame [src]="url" />`,
})
export class SwaggerPage {
  readonly url = `${environment.apiBaseUrl}/swagger-ui/index.html`;
}
