import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssignmentRecordPageComponent } from './assignment-record-page.component';
import { Card } from '@core/models/Card';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { CardService } from '@core/services/card.service';
import { SpinnerService } from '@core/services/spinner.service';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { Component, Input } from '@angular/core';

// Mock Component
@Component({
  selector: 'app-card-xl',
  template: '',
  standalone: true,
})
class MockCardXlComponent {
  @Input() mapSRC: string | undefined;
  @Input() mapName: string | undefined;
}

describe('AssignmentRecordPageComponent', () => {
  let component: AssignmentRecordPageComponent;
  let fixture: ComponentFixture<AssignmentRecordPageComponent>;
  let mockTerritoryDataService: Record<string, unknown>;
  let mockCardService: Record<string, unknown>;
  let mockSpinnerService: Record<string, unknown>;

  beforeEach(async () => {
    mockTerritoryDataService = {
      getCardAssigned: vi.fn().mockReturnValue(of([{ id: '1', territory: '1' }])),
      getRevisionCardTerritorie: vi.fn().mockReturnValue(of([{ id: '2', territory: '2' }])),
      getMaps: vi.fn().mockReturnValue(of([{ maps: [{ name: 'urbano', label: 'map' }] }])),
      getNumberTerritory: vi
        .fn()
        .mockReturnValue(of([{ wheelwright: [{ territorio: 1 }], rural: [{ territorio: 1 }] }])),
      postCardAssigned: vi.fn().mockResolvedValue(true),
      deleteCardAssigned: vi.fn().mockResolvedValue(true),
      deleteCardTerritorie: vi.fn().mockResolvedValue(true),
    };

    mockCardService = {
      goRevisionCard: vi.fn(),
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AssignmentRecordPageComponent, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: CardService, useValue: mockCardService },
        { provide: SpinnerService, useValue: mockSpinnerService },
      ],
    })
      .overrideComponent(AssignmentRecordPageComponent, {
        remove: { imports: [CardXlComponent] },
        add: { imports: [MockCardXlComponent] },
      })
      .compileComponents();
  });

  beforeEach(() => {
    sessionStorage.clear();
    fixture = TestBed.createComponent(AssignmentRecordPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize data on create', () => {
    expect(mockSpinnerService['cargarSpinner']).toHaveBeenCalled();
    expect(mockTerritoryDataService['getCardAssigned']).toHaveBeenCalled();
    expect(mockTerritoryDataService['getRevisionCardTerritorie']).toHaveBeenCalled();
    expect(component.allCardsAssigned().length).toBe(1);
    expect(component.allCardsReceived().length).toBe(1);
  });

  it('should get maps from session storage if exists', () => {
    sessionStorage.setItem('territorioMaps', JSON.stringify([{ name: 'test' }]));
    vi.clearAllMocks();
    component.ngOnInit();
    expect(component.territorioMaps().length).toBe(1);
    expect(mockTerritoryDataService['getMaps']).not.toHaveBeenCalled();
  });

  it('should check if date is overdue', () => {
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 3);
    expect(component.isOverdue(pastDate)).toBe(true);

    const futureDate = new Date();
    expect(component.isOverdue(futureDate)).toBe(false);
  });

  it('should post card assigned', async () => {
    component.formCard().patchValue({
      location: 'Wheelwright',
      publisher: 'John Doe',
      territory: 1,
      date: new Date().toISOString(),
    });

    await component.postCardAssigned();

    expect(mockTerritoryDataService['postCardAssigned']).toHaveBeenCalled();
    expect(component.isCreationModalOpen()).toBe(false);
  });

  it('should confirm delete and trigger deletion', () => {
    const card = { id: '1', territory: '1' } as unknown as Card;
    component.cardConfirmationDelete(card);
    expect(component.cardConfirmation()).toEqual(card);

    component.cardDelete();
    expect(mockTerritoryDataService['deleteCardTerritorie']).toHaveBeenCalledWith(card);
    expect(component.cardConfirmation()).toBeNull();
  });
});
