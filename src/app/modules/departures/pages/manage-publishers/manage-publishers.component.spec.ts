import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManagePublishersComponent } from './manage-publishers.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';

describe('ManagePublishersComponent', () => {
  let component: ManagePublishersComponent;
  let fixture: ComponentFixture<ManagePublishersComponent>;
  let mockTerritoryDataService: any;
  let mockSpinnerService: any;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockTerritoryDataService = {
      getGroupList: vi.fn().mockReturnValue(of([{ id: 'Grupo 2', publishers: [] }, { id: 'Grupo 1', publishers: [] }])),
      setGroup: vi.fn().mockResolvedValue(true),
      deleteGroup: vi.fn().mockResolvedValue(true)
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn()
    };

    mockAuthService = {
      isAdmin: vi.fn().mockReturnValue(true)
    };

    mockRouter = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ManagePublishersComponent, CommonModule, FormsModule, DragDropModule],
      providers: [
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: SpinnerService, useValue: mockSpinnerService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ManagePublishersComponent);
    component = fixture.componentInstance;
  });

  it('should create and load groups sorted', () => {
    fixture.detectChanges(); // calls ngOnInit
    expect(component).toBeTruthy();
    expect(mockSpinnerService.cargarSpinner).toHaveBeenCalled();
    expect(mockTerritoryDataService.getGroupList).toHaveBeenCalled();
    // groups should be sorted by number
    expect(component.groups[0].id).toBe('Grupo 1');
    expect(component.groups[1].id).toBe('Grupo 2');
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
  });

  it('should navigate away if not admin', () => {
    mockAuthService.isAdmin.mockReturnValue(false);
    fixture.detectChanges();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/salidas']);
  });

  it('should add group', async () => {
    fixture.detectChanges();
    await component.addGroup(); // Should add 'Grupo 3' based on next number
    expect(mockTerritoryDataService.setGroup).toHaveBeenCalledWith('Grupo 3', { publishers: [] });
  });

  it('should add publisher', () => {
    fixture.detectChanges();
    component.newPublisherName['Grupo 1'] = 'John Doe';
    component.addPublisher('Grupo 1');
    expect(component.groups.find(g => g.id === 'Grupo 1')?.publishers[0].name).toBe('John Doe');
    expect(mockTerritoryDataService.setGroup).toHaveBeenCalled();
  });

  it('should remove publisher', () => {
    fixture.detectChanges();
    component.groups.find(g => g.id === 'Grupo 1')?.publishers.push({ name: 'Jane', assignment: '' });
    component.removePublisher('Grupo 1', 0);
    expect(component.groups.find(g => g.id === 'Grupo 1')?.publishers.length).toBe(0);
    expect(mockTerritoryDataService.setGroup).toHaveBeenCalled();
  });

  it('should handle getGroupList error gracefully', () => {
    mockTerritoryDataService.getGroupList.mockReturnValue(throwError(() => new Error('Error')));
    fixture.detectChanges();
    expect(component.groups).toEqual([]);
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
  });
});
