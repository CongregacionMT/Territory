import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginPageComponent } from './login-page.component';
import { AuthService } from '@core/services/auth.service';
import { SpinnerService } from '@core/services/spinner.service';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { User } from '@core/models/User';

describe('LoginPageComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  let mockAuthService: { login: ReturnType<typeof vi.fn> };
  let mockSpinnerService: {
    cargarSpinner: ReturnType<typeof vi.fn>;
    cerrarSpinner: ReturnType<typeof vi.fn>;
  };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockAuthService = {
      login: vi.fn().mockReturnValue(of([])),
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: SpinnerService, useValue: mockSpinnerService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    localStorage.clear();
    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create form with empty user and password', () => {
    expect(component).toBeTruthy();
    expect(component.formLogin.get('user')?.value).toBe('');
    expect(component.formLogin.get('password')?.value).toBe('');
  });

  it('should toggle password visibility', () => {
    expect(component.passwordVisible()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.passwordVisible()).toBe(true);
  });

  it('should set loginError if user not found', () => {
    mockAuthService.login.mockReturnValue(of([]));

    component.formLogin.patchValue({ user: 'invalid', password: '123' });
    component.loginWithUser();

    expect(mockSpinnerService.cargarSpinner).toHaveBeenCalled();
    expect(mockAuthService.login).toHaveBeenCalledWith('invalid', '123');
    expect(component.loginError()).toBe(true);
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to home on successful login', () => {
    const mockUser: User = { user: 'admin', rol: 'admin', uid: '1', nombre: 'Admin', clave: '123' };
    mockAuthService.login.mockReturnValue(of([mockUser]));

    component.formLogin.patchValue({ user: 'admin', password: '123' });
    component.loginWithUser();

    expect(mockAuthService.login).toHaveBeenCalledWith('admin', '123');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['home']);
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
  });
});
