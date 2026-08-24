import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { StatisticsPageComponent } from './statistics-page.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { ActivatedRoute } from '@angular/router';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of, BehaviorSubject } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { SortBy } from '@core/pipes/sort-by.pipe';

describe('StatisticsPageComponent', () => {
  let component: StatisticsPageComponent;
  let fixture: ComponentFixture<StatisticsPageComponent>;
  let mockTerritoryDataService: any;
  let mockSpinnerService: any;
  let mockActivatedRoute: any;
  let paramMapSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    paramMapSubject = new BehaviorSubject({ get: () => 'Wheelwright' });

    mockTerritoryDataService = {
      getCardAssigned: vi.fn().mockReturnValue(of([{ id: '1', location: 'Wheelwright', territory: 1 }])),
      getCardTerritorie: vi.fn().mockReturnValue(of([
        { applesData: [{ checked: true }], creation: new Date().toISOString() } // Blueprint with 1 apple, and activity
      ]))
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn()
    };

    mockActivatedRoute = {
      snapshot: { paramMap: { get: () => 'Wheelwright' } },
      paramMap: paramMapSubject.asObservable()
    };

    await TestBed.configureTestingModule({
      imports: [StatisticsPageComponent, ReactiveFormsModule, SortBy, DatePipe, DecimalPipe],
      providers: [
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: SpinnerService, useValue: mockSpinnerService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    sessionStorage.clear();
    fixture = TestBed.createComponent(StatisticsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should set initial locality from url param', () => {
    fixture.detectChanges();
    expect(component.territoryPath()).toBe('Wheelwright');
  });

  it('should react to route param changes', () => {
    fixture.detectChanges();
    paramMapSubject.next({ get: () => 'Rural' });
    fixture.detectChanges();
    expect(component.territoryPath()).toBe('Rural');
  });

  it('should get data from storage if exists', async () => {
    sessionStorage.setItem('statisticDataWheelwright_6', JSON.stringify([[ { numberTerritory: 1, driver: 'Test' } ]]));
    fixture.detectChanges();
    
    // Wait for the async getDataStatisticTerritory
    await component.getDataStatisticTerritory();
    
    expect(component.dataListFull().length).toBeGreaterThan(0);
    expect(mockSpinnerService.cargarSpinner).not.toHaveBeenCalled();
  });

  it('should fetch data if not in storage', async () => {
    sessionStorage.setItem('numberTerritory', JSON.stringify({ 'Wheelwright': [{ collection: 'coll1', territorio: 1 }] }));
    fixture.detectChanges();
    
    await component.getDataStatisticTerritory();
    
    expect(mockSpinnerService.cargarSpinner).toHaveBeenCalled();
    expect(mockTerritoryDataService.getCardTerritorie).toHaveBeenCalledWith('coll1', 120);
    expect(component.dataListFull().length).toBe(1);
    expect(component.summaryStats().totalApples).toBe(1);
  });

  it('should set time range and fetch data', async () => {
    fixture.detectChanges();
    await component.setTimeRange(12);
    expect(component.timeRange()).toBe(12);
    expect(mockSpinnerService.cargarSpinner).toHaveBeenCalled();
  });

  it('should refresh data', async () => {
    fixture.detectChanges();
    await component.refreshData();
    expect(mockSpinnerService.cargarSpinner).toHaveBeenCalled();
  });

  it('should determine if territory is personal', () => {
    fixture.detectChanges();
    const isPersonal = component.isPersonalTerritory(1);
    expect(isPersonal).toBe(true);
    
    const isNotPersonal = component.isPersonalTerritory(2);
    expect(isNotPersonal).toBe(false);
  });

  it('should get personal entry', () => {
    fixture.detectChanges();
    const entry = component.getPersonalEntry(1);
    expect(entry?.location).toBe('Wheelwright');
  });

  it('should sort table columns', () => {
    fixture.detectChanges();
    
    expect(component.path()).toBe('end');
    expect(component.order()).toBe(1);

    component.sortTable('driver');
    expect(component.path()).toBe('driver');
    expect(component.order()).toBe(1);

    component.sortTable('driver');
    expect(component.path()).toBe('driver');
    expect(component.order()).toBe(-1);
  });

  it('should determine row color based on last end date', () => {
    fixture.detectChanges();
    
    let past = new Date();
    past.setDate(past.getDate() - 10);
    expect(component.paintRow([{ end: past.toISOString() }] as any)).toBe('success');
    
    past = new Date();
    past.setDate(past.getDate() - 30);
    expect(component.paintRow([{ end: past.toISOString() }] as any)).toBe('primary');
    
    past = new Date();
    past.setDate(past.getDate() - 50);
    expect(component.paintRow([{ end: past.toISOString() }] as any)).toBe('warning');
    
    past = new Date();
    past.setDate(past.getDate() - 60);
    expect(component.paintRow([{ end: past.toISOString() }] as any)).toBe('danger');
    
    expect(component.paintRow([])).toBe('danger');
  });
});
