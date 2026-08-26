import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsersPageComponent } from './users-page.component';
import { UsersFeatureService } from '../services/users-feature.service';
import { DialogService } from '@core/services/dialog.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal } from '@angular/core';

describe('UsersPageComponent', () => {
  let component: UsersPageComponent;
  let fixture: ComponentFixture<UsersPageComponent>;
  let mockFeatureService: any;
  let mockDialogService: any;
  let mockSnackBar: any;

  beforeEach(async () => {
    mockFeatureService = {
      users: signal([{ user: 'test', rol: 'admin' }]),
      error: signal<string | null>(null),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
    };

    mockDialogService = {
      openDialog: vi.fn().mockReturnValue(of(true)),
    };

    mockSnackBar = {
      open: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [UsersPageComponent, ReactiveFormsModule],
      providers: [
        { provide: DialogService, useValue: mockDialogService },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    })
      .overrideComponent(UsersPageComponent, {
        remove: { providers: [UsersFeatureService] },
        add: { providers: [{ provide: UsersFeatureService, useValue: mockFeatureService }] },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UsersPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not call createUser if form is invalid', async () => {
    component.formUser.patchValue({ user: '', password: '' });
    await component.createUser();
    expect(component.showError()).toBe(true);
    expect(mockFeatureService.createUser).not.toHaveBeenCalled();
  });

  it('should call createUser and reset form on success', async () => {
    component.formUser.patchValue({ user: 'new_user', password: '123', rol: 'admin' });
    mockFeatureService.createUser.mockResolvedValue(true);

    await component.createUser();

    expect(mockFeatureService.createUser).toHaveBeenCalled();
    expect(component.formUser.value.user).toBe(''); // Form reset
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      '👤 Usuario creado con éxito',
      'ok',
      expect.any(Object),
    );
  });

  it('should call deleteUser if confirmed', async () => {
    mockFeatureService.deleteUser.mockResolvedValue(true);
    component.deleteUser('test');

    expect(mockDialogService.openDialog).toHaveBeenCalled();

    // Wait for promise resolution
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFeatureService.deleteUser).toHaveBeenCalledWith('test');
  });
});
