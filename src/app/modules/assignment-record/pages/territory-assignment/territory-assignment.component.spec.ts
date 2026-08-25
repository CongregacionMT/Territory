import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TerritoryAssignmentComponent } from './territory-assignment.component';
import { Card } from '@core/models/Card';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { HttpClient } from '@angular/common/http';
import { PdfService } from '@core/services/pdf.service';
import { ActivatedRoute } from '@angular/router';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

describe('TerritoryAssignmentComponent', () => {
  let component: TerritoryAssignmentComponent;
  let fixture: ComponentFixture<TerritoryAssignmentComponent>;
  let mockTerritoryDataService: Record<string, unknown>;
  let mockSpinnerService: Record<string, unknown>;
  let mockHttpClient: Record<string, unknown>;
  let mockPdfService: Record<string, unknown>;
  let mockActivatedRoute: Record<string, unknown>;

  beforeEach(async () => {
    mockTerritoryDataService = {
      getNumberTerritory: vi
        .fn()
        .mockReturnValue(of([{ test: [{ collection: 'coll1', territorio: 1 }] }])),
      getCardTerritorieRegisterTable: vi
        .fn()
        .mockReturnValue(of([{ id: '1', driver: 'John', applesData: [{ checked: true }] }])),
      addCardInCollection: vi.fn().mockResolvedValue(true),
      updateCardInCollection: vi.fn().mockResolvedValue(true),
      deleteCardInCollection: vi.fn().mockResolvedValue(true),
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn(),
    };

    mockHttpClient = {
      get: vi.fn().mockReturnValue(of(new ArrayBuffer(8))),
    };

    mockPdfService = {
      generateTerritoryAssignmentPDF: vi.fn().mockResolvedValue(true),
    };

    mockActivatedRoute = {
      snapshot: { url: [{ path: 'test', toString: (): string => 'test' }] },
    };

    await TestBed.configureTestingModule({
      imports: [TerritoryAssignmentComponent, ReactiveFormsModule, FormsModule],
      providers: [
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: SpinnerService, useValue: mockSpinnerService },
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: PdfService, useValue: mockPdfService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    sessionStorage.clear();
    fixture = TestBed.createComponent(TerritoryAssignmentComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should initialize data from sessionStorage if available', () => {
    sessionStorage.setItem(
      'numberTerritory',
      JSON.stringify({ test: [{ collection: 'coll1', territorio: 1 }] }),
    );
    sessionStorage.setItem(
      'registerStatisticDataTerritorioMT',
      JSON.stringify([
        [
          {
            id: '1',
            driver: 'John',
            applesData: [{ checked: true }],
            start: new Date().toISOString(),
          },
        ],
      ]),
    );

    fixture.detectChanges();

    expect(component.dataListFull().length).toBeGreaterThan(0);
    expect(component.territoriesNumber().length).toBe(1);
    expect(mockSpinnerService['cargarSpinner']).not.toHaveBeenCalled(); // Since data is loaded from session
  });

  it('should fetch data if sessionStorage is missing data', () => {
    sessionStorage.setItem(
      'numberTerritory',
      JSON.stringify({ test: [{ collection: 'coll1', territorio: 1 }] }),
    );

    fixture.detectChanges();

    expect(mockSpinnerService['cargarSpinner']).toHaveBeenCalled();
    expect(mockTerritoryDataService['getCardTerritorieRegisterTable']).toHaveBeenCalledWith(
      'coll1',
    );
  });

  it('should filter data by date correctly', () => {
    const today = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(today.getFullYear() - 2);

    const data = [
      [
        { id: '1', driver: 'Recent', start: today.toISOString(), applesData: [{ checked: true }] },
        {
          id: '2',
          driver: 'Old',
          start: twoYearsAgo.toISOString(),
          applesData: [{ checked: true }],
        },
      ],
    ] as unknown as Card[][];

    component.dataListFull.set(data);
    component.sortByDate('1'); // Last 6 months

    expect(component.filterDataListFull()[0].length).toBe(1);
    expect(component.filterDataListFull()[0][0].driver).toBe('Recent');

    component.sortByDate('2'); // Last year
    expect(component.filterDataListFull()[0].length).toBe(1);

    component.sortByDate(twoYearsAgo.getFullYear().toString()); // Specific year
    expect(component.filterDataListFull()[0].length).toBe(1);
    expect(component.filterDataListFull()[0][0].driver).toBe('Old');
  });

  it('should refresh data', () => {
    fixture.detectChanges();
    component.refreshData();

    expect(mockSpinnerService['cargarSpinner']).toHaveBeenCalled();
    expect(mockTerritoryDataService['getNumberTerritory']).toHaveBeenCalled();
  });

  it('should add card to pending changes', () => {
    fixture.detectChanges();
    component.dataListFull.set([[]]);

    component.addCard('coll1', 0);

    const pending = component.pendingChanges();
    const keys = Object.keys(pending);
    expect(keys.length).toBe(1);
    expect(pending[keys[0]].isNew).toBe(true);
    expect(component.dataListFull()[0].length).toBe(1);
  });

  it('should mark card for delete', () => {
    fixture.detectChanges();
    const card = { id: '1', driver: 'Test' } as unknown as Card;
    component.dataListFull.set([[card]]);

    component.markForDelete(card, 'coll1');

    expect(component.pendingDeletes()['coll1_1']).toBeDefined();
  });

  it('should cancel delete', () => {
    fixture.detectChanges();
    const card = { id: '1', driver: 'Test' } as unknown as Card;
    component.pendingDeletes.set({ coll1_1: { collectionName: 'coll1', cardId: '1' } });

    component.cancelDelete(card, 'coll1');

    expect(component.pendingDeletes()['coll1_1']).toBeUndefined();
  });

  it('should save all changes', async () => {
    fixture.detectChanges();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.pendingChanges.set({
      coll1_1: { collectionName: 'coll1', cardId: '1', data: { driver: 'Update' } },
      coll1_temp: { collectionName: 'coll1', cardId: 'temp', data: { id: 'temp' }, isNew: true },
    });
    component.pendingDeletes.set({
      coll1_2: { collectionName: 'coll1', cardId: '2' },
    });

    await component.saveAllChanges();

    expect(mockTerritoryDataService['updateCardInCollection']).toHaveBeenCalledWith('coll1', '1', {
      driver: 'Update',
    });
    expect(mockTerritoryDataService['addCardInCollection']).toHaveBeenCalled();
    expect(mockTerritoryDataService['deleteCardInCollection']).toHaveBeenCalledWith('coll1', '2');
  });

  it('should discard all changes', () => {
    fixture.detectChanges();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.pendingChanges.set({ coll1_1: { collectionName: 'coll1', cardId: '1', data: {} } });
    component.discardAllChanges();

    expect(Object.keys(component.pendingChanges()).length).toBe(0);
  });
});
