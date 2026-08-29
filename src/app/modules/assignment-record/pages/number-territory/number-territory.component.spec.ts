import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NumberTerritoryComponent } from './number-territory.component';
import { ActivatedRoute } from '@angular/router';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatePipe } from '@angular/common';

describe('NumberTerritoryComponent', () => {
  let component: NumberTerritoryComponent;
  let fixture: ComponentFixture<NumberTerritoryComponent>;
  let mockTerritoryDataService: Record<string, unknown>;
  let mockSpinnerService: Record<string, unknown>;
  let mockActivatedRoute: Record<string, unknown>;

  beforeEach(async () => {
    mockTerritoryDataService = {
      getCardTerritorie: vi.fn().mockReturnValue(
        of([
          {
            territoryNumber: 1,
            creation: { seconds: 1700000000 },
            start: { seconds: 1700000000 },
            end: { seconds: 1700000000 },
            applesData: [{ checked: true, name: 'Manzana 1' }],
          },
          {
            territoryNumber: 1,
            applesData: [{ checked: false, name: 'Manzana 2' }],
          },
        ]),
      ),
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn(),
    };

    mockActivatedRoute = {
      snapshot: { params: { collection: 'urbano' } },
    };

    await TestBed.configureTestingModule({
      imports: [NumberTerritoryComponent, DatePipe],
      providers: [
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: SpinnerService, useValue: mockSpinnerService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NumberTerritoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load cards and filter zero-apple entries', () => {
    expect(mockSpinnerService['cargarSpinner']).toHaveBeenCalled();
    expect(mockTerritoryDataService['getCardTerritorie']).toHaveBeenCalledWith('urbano');

    // Only 1 item should remain since the second item had checked: false
    expect(component.dataList().length).toBe(1);
    expect(mockSpinnerService['cerrarSpinner']).toHaveBeenCalled();
  });

  it('should set territory number from first card', () => {
    expect(component.numberTerritory()).toBe(1);
  });

  it('should convert Firestore Timestamp to date correctly', () => {
    const card = component.dataList()[0];
    expect(card.creation instanceof Date).toBe(true);
    expect(card.start instanceof Date).toBe(true);
    expect(card.end instanceof Date).toBe(true);
  });
});
