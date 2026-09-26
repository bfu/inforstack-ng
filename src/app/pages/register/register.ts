import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalService } from 'ng-zorro-antd/modal';
import { LoginApi } from '@api/login';
import { environment } from '@env/environment';

/** 两次密码一致性校验 */
function equalToPassword(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (!password || !confirmPassword) {
    return null;
  }
  return password === confirmPassword ? null : { notEqual: true };
}

/**
 * 注册页
 * 对应 ruoyi-vue3/src/views/register.vue
 */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, NzFormModule, NzInputModule, NzButtonModule],
  templateUrl: './register.html',
  styleUrl: './register.less',
})
export class Register implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(LoginApi);
  private readonly router = inject(Router);
  private readonly modal = inject(NzModalService);

  readonly title = environment.title;
  readonly footerContent = environment.footerContent;

  readonly form = this.fb.nonNullable.group(
    {
      username: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(20)]],
      password: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(20)]],
      confirmPassword: ['', [Validators.required]],
      code: [''],
      uuid: [''],
    },
    { validators: equalToPassword },
  );

  readonly codeUrl = signal('');
  readonly captchaEnabled = signal(true);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.getCode();
  }

  getCode(): void {
    this.api.getCodeImg().subscribe({
      next: (res) => {
        const enabled = res.captchaEnabled === undefined ? true : res.captchaEnabled;
        this.captchaEnabled.set(enabled);
        if (enabled) {
          this.codeUrl.set(`data:image/gif;base64,${res.img ?? ''}`);
          this.form.patchValue({ uuid: res.uuid ?? '', code: '' });
          this.form.controls.code.setValidators([Validators.required]);
        } else {
          this.form.controls.code.clearValidators();
        }
        this.form.controls.code.updateValueAndValidity();
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      if (this.form.hasError('notEqual')) {
        this.modal.error({ nzTitle: '系统提示', nzContent: '两次输入的密码不一致' });
      }
      return;
    }
    this.loading.set(true);
    const value = this.form.getRawValue();
    this.api
      .register({
        username: value.username.trim(),
        password: value.password,
        confirmPassword: value.confirmPassword,
        code: value.code,
        uuid: value.uuid,
      })
      .subscribe({
        next: () => {
          this.modal
            .success({
              nzTitle: '系统提示',
              nzContent: `恭喜你，您的账号 ${value.username} 注册成功！`,
              nzOkText: '确定',
            })
            .afterClose.subscribe(() => {
              void this.router.navigate(['/login']);
            });
        },
        error: () => {
          this.loading.set(false);
          if (this.captchaEnabled()) {
            this.getCode();
          }
        },
      });
  }
}
