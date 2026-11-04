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
      updateUser: vi.fn(),
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
        remove: { providers: [UsersFeatureService, DialogService] },
        add: {
          providers: [
            { provide: UsersFeatureService, useValue: mockFeatureService },
            { provide: DialogService, useValue: mockDialogService },
          ],
        },
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

  it('should not call createUser on submit if form is invalid', async () => {
    component.formUser.patchValue({ user: '', password: '' });
    await component.submitUser();
    expect(component.showError()).toBe(true);
    expect(mockFeatureService.createUser).not.toHaveBeenCalled();
  });

  it('should call createUser on submit and reset form on success', async () => {
    component.formUser.patchValue({ user: 'new_user', password: '123', rol: 'admin' });
    mockFeatureService.createUser.mockResolvedValue(true);

    await component.submitUser();

    expect(mockFeatureService.createUser).toHaveBeenCalled();
    expect(component.formUser.value.user).toBe(''); // Form reset
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      '👤 Usuario creado con éxito',
      'ok',
      expect.any(Object),
    );
  });

  it('should call updateUser when editing an existing user', async () => {
    mockFeatureService.updateUser.mockResolvedValue(true);
    component.editUser({ user: 'test', rol: 'admin', password: '123' } as never);

    await component.submitUser();

    expect(mockFeatureService.updateUser).toHaveBeenCalledWith(
      'test',
      expect.objectContaining({ user: 'test', rol: 'admin' }),
    );
    expect(component.editingUserId()).toBeNull();
    expect(mockSnackBar.open).toHaveBeenCalledWith(
      '👤 Usuario actualizado con éxito',
      'ok',
      expect.any(Object),
    );
  });

  it('should call deleteUser if confirmed', async () => {
    mockDialogService.openDialog.mockReturnValue(of(true));
    mockFeatureService.deleteUser.mockResolvedValue(true);
    component.deleteUser('test');

    expect(mockDialogService.openDialog).toHaveBeenCalled();

    // Wait for async operations (subscribe + async IIFE)
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFeatureService.deleteUser).toHaveBeenCalledWith('test');
  });
});
