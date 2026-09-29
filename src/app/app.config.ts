import {
  ApplicationConfig,
  ErrorHandler,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { routes } from './app.routes';
import { icons } from './icons-provider';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { zh_CN, provideNzI18n } from 'ng-zorro-antd/i18n';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { registerLocaleData } from '@angular/common';
import zh from '@angular/common/locales/zh';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { GlobalErrorHandler } from './core/global-error-handler';
import { RuoYiReuseStrategy } from './core/reuse-strategy';

registerLocaleData(zh);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // 全局兜底错误处理（浏览器层异常由上面的 listeners 转发至此）
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    { provide: RouteReuseStrategy, useClass: RuoYiReuseStrategy },
    provideNzIcons(icons),
    provideNzI18n(zh_CN),
    provideNzDateFnsAdapter(),
    // NzModalService 由 NzModalModule 提供（非 providedIn: 'root'），
    // 拦截器在根注入器中注入它，需在应用级注册该模块的 providers
    importProvidersFrom(NzModalModule),
  ],
};
