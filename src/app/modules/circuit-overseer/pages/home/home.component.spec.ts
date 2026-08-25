import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { CircuitOverseerService } from '../../services/circuit-overseer.service';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('CircuitOverseer HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      getOverseerData: vi.fn().mockReturnValue(of({ name: 'John Doe' })),
      updateOverseerName: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule, FormsModule],
      providers: [
        { provide: CircuitOverseerService, useValue: mockService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should save name if not empty', () => {
    component.newName = 'New Name';
    component.saveName();
    expect(mockService.updateOverseerName).toHaveBeenCalledWith('New Name');
    expect(component.newName).toBe('');
  });

  it('should not save name if empty', () => {
    component.newName = '   ';
    component.saveName();
    expect(mockService.updateOverseerName).not.toHaveBeenCalled();
  });
});
