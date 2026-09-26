import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { UserStore } from '../../store/user.store';
import { parseTime } from '../../core/utils/ruoyi';

interface QuickEntry {
  title: string;
  icon: string;
  path: string;
}

/** 首页概览，对应 ruoyi-vue3/src/views/index.vue */
@Component({
  selector: 'app-index',
  imports: [RouterLink, NzCardModule, NzIconModule, NzTagModule],
  templateUrl: './index.html',
  styleUrl: './index.less',
})
export class Index {
  readonly store = inject(UserStore);

  readonly today = parseTime(new Date(), '{y}年{m}月{d}日');
  readonly roleText = computed(() => this.store.roles().join('、') || '—');

  readonly quickEntries: QuickEntry[] = [
    { title: '用户管理', icon: 'user', path: '/system/user' },
    { title: '角色管理', icon: 'team', path: '/system/role' },
    { title: '菜单管理', icon: 'bars', path: '/system/menu' },
    { title: '部门管理', icon: 'apartment', path: '/system/dept' },
    { title: '岗位管理', icon: 'idcard', path: '/system/post' },
    { title: '字典管理', icon: 'book', path: '/system/dict' },
    { title: '参数设置', icon: 'setting', path: '/system/config' },
    { title: '通知公告', icon: 'notification', path: '/system/notice' },
  ];
}
