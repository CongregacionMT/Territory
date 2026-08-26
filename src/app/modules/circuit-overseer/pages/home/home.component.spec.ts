import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { CircuitOverseerService } from '../../services/circuit-overseer.service';
import { provideRouter } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';
import { AuthService } from '@core/services/auth.service';

describe('CircuitOverseer HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockService: any;
  let mockAuthService: any;

  beforeEach(async () => {
    mockService = {
      getOverseerData: vi.fn().mockReturnValue(of({ name: 'John Doe' })),
      updateOverseerName: vi.fn(),
    };

    mockAuthService = {
      isAdmin: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent, FormsModule],
      providers: [
        provideRouter([]),
        { provide: CircuitOverseerService, useValue: mockService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should save name if not empty', () => {
    component.newName.set('New Name');
    component.saveName();
    expect(mockService.updateOverseerName).toHaveBeenCalledWith('New Name');
    expect(component.newName()).toBe('');
  });

  it('should not save name if empty', () => {
    component.newName.set('   ');
    component.saveName();
    expect(mockService.updateOverseerName).not.toHaveBeenCalled();
  });

  it('should not render admin section if not admin', () => {
    mockAuthService.isAdmin.set(false);
    fixture.detectChanges();
    const adminSection = fixture.nativeElement.querySelector(
      'section[aria-label="Administración de superintendente"]',
    );
    expect(adminSection).toBeNull();
  });

  it('should render admin section if admin', () => {
    mockAuthService.isAdmin.set(true);
    fixture.detectChanges();
    const adminSection = fixture.nativeElement.querySelector(
      'section[aria-label="Administración de superintendente"]',
    );
    expect(adminSection).toBeTruthy();
  });
});
