import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzResultModule } from 'ng-zorro-antd/result';

/** 404 页面，对应 ruoyi-vue3/src/views/error/404.vue */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-not-found',
  imports: [RouterLink, NzButtonModule, NzResultModule],
  templateUrl: './not-found.html',
  styleUrl: './not-found.less',
})
export class NotFound {}
