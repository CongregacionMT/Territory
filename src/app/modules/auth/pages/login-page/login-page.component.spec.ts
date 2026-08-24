import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginPageComponent } from './login-page.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { User } from '@core/models/User';

describe('LoginPageComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  let mockTerritoryDataService: any;
  let mockSpinnerService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockTerritoryDataService = {
      loginUser: vi.fn().mockReturnValue(of([]))
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent, ReactiveFormsModule],
      providers: [
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: SpinnerService, useValue: mockSpinnerService },
        { provide: Router, useValue: mockRouter }
      ]
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

  it('should force user input to lowercase', () => {
    component.formLogin.get('user')?.setValue('UPPERCASE');
    expect(component.formLogin.get('user')?.value).toBe('uppercase');
  });

  it('should toggle password visibility', () => {
    expect(component.passwordVisible()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.passwordVisible()).toBe(true);
  });

  it('should set loginError if user not found', async () => {
    mockTerritoryDataService.loginUser.mockReturnValue(of([]));
    
    component.formLogin.patchValue({ user: 'invalid', password: '123' });
    await component.loginWhitUser();
    
    expect(mockSpinnerService.cargarSpinner).toHaveBeenCalled();
    expect(mockTerritoryDataService.loginUser).toHaveBeenCalledWith('invalid', '123');
    expect(component.loginError()).toBe(true);
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to home on successful admin login', async () => {
    const adminUser: User = { user: 'admin', rol: 'admin', uid: '1', nombre: 'Admin', clave: '123' };
    mockTerritoryDataService.loginUser.mockReturnValue(of([adminUser]));
    
    component.formLogin.patchValue({ user: 'admin', password: '123' });
    await component.loginWhitUser();
    
    expect(localStorage.getItem('tokenAdmin')).toBeTruthy();
    expect(localStorage.getItem('admin')).toBeTruthy();
    expect(localStorage.getItem('nombreConductor')).toBe('admin');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['home']);
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
  });

  it('should navigate to home on successful conductor login', async () => {
    const conductorUser: User = { user: 'conductor', rol: 'conductor', uid: '2', nombre: 'Conductor', clave: '123' };
    mockTerritoryDataService.loginUser.mockReturnValue(of([conductorUser]));
    
    component.formLogin.patchValue({ user: 'conductor', password: '123' });
    await component.loginWhitUser();
    
    expect(localStorage.getItem('tokenConductor')).toBeTruthy();
    expect(localStorage.getItem('conductor')).toBeTruthy();
    expect(localStorage.getItem('nombreConductor')).toBe('conductor');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['home']);
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
  });
});
