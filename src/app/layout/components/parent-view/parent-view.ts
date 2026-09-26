import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * 多级菜单的中间层容器
 * 对应 ruoyi-vue3/src/components/ParentView
 */
@Component({
  selector: 'app-parent-view',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class ParentView {}
