import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { NgStyle } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SpinnerService } from '@core/services/spinner.service';
import { AuthService } from '@core/services/auth.service';
import { User } from '@core/models/User';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgStyle],
})
export class LoginPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly spinner = inject(SpinnerService);

  loginError = signal(false);
  passwordVisible = signal(false);
  view = signal<'login' | 'drivers'>('login');
  drivers = signal<User[]>([]);

  formLogin = this.fb.nonNullable.group({
    user: ['', [Validators.required.bind(Validators)]],
    password: ['', [Validators.required.bind(Validators)]],
  });

  ngOnInit(): void {
    this.authService.getDrivers().subscribe((drivers) => {
      this.drivers.set(drivers);
    });
  }

  loginAsDriver(driver: User): void {
    this.authService.loginAsDriver(driver);
    void this.router.navigate(['home']);
  }

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
