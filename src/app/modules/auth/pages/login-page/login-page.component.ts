import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SpinnerService } from '@core/services/spinner.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
})
export class LoginPageComponent {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private spinner = inject(SpinnerService);

  loginError = signal(false);
  passwordVisible = signal(false);

  formLogin = this.fb.nonNullable.group({
    user: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  loginWithUser(): void {
    if (this.formLogin.invalid) return;

    this.spinner.cargarSpinner();
    this.loginError.set(false);

    const { user, password } = this.formLogin.getRawValue();

    this.authService.login(user.toLowerCase(), password).subscribe({
      next: (users) => {
        if (users.length !== 0) {
          void this.router.navigate(['home']);
        } else {
          this.loginError.set(true);
        }
        this.spinner.cerrarSpinner();
      },
      error: () => {
        this.loginError.set(true);
        this.spinner.cerrarSpinner();
      },
    });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  get User(): import('@angular/forms').AbstractControl | null {
    return this.formLogin.get('user');
  }
  get Password(): import('@angular/forms').AbstractControl | null {
    return this.formLogin.get('password');
  }
}
