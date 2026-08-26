import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatisticsPageComponent } from './statistics-page.component';
import { StatisticsFeatureService } from '../../services/statistics-feature.service';
import { ComponentRef } from '@angular/core';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { signal } from '@angular/core';

describe('StatisticsPageComponent', () => {
  let component: StatisticsPageComponent;
  let fixture: ComponentFixture<StatisticsPageComponent>;
  let componentRef: ComponentRef<StatisticsPageComponent>;

  let mockStatsService: any;

  beforeEach(async () => {
    mockStatsService = {
      loadingData: signal(false),
      dataListFull: signal([]),
      summaryStats: signal({
        totalTerritories: 0,
        completedInPeriod: 0,
        percentCompleted: 0,
        totalApples: 0,
      }),
      timeRange: signal(12),
      personalTerritories: signal([]),
      loadLocalityData: vi.fn(),
      setTimeRange: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [StatisticsPageComponent],
    })
      .overrideComponent(StatisticsPageComponent, {
        remove: { providers: [StatisticsFeatureService] },
        add: { providers: [{ provide: StatisticsFeatureService, useValue: mockStatsService }] },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StatisticsPageComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('locality', 'Wheelwright');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should trigger loadLocalityData on init', () => {
    fixture.detectChanges();
    expect(mockStatsService.loadLocalityData).toHaveBeenCalledWith('Wheelwright');
  });

  it('should change timeRange', () => {
    fixture.detectChanges();
    component.setTimeRange(6);
    expect(mockStatsService.setTimeRange).toHaveBeenCalledWith(6);
  });

  it('should refresh data', () => {
    fixture.detectChanges();
    component.refreshData();
    expect(mockStatsService.loadLocalityData).toHaveBeenCalledWith('Wheelwright', true);
  });

  it('should sort data path ascending', () => {
    fixture.detectChanges();
    component.onSortChanged('numberTerritory');
    expect(component.currentSortPath).toBe('numberTerritory');
    expect(component.order).toBe(1);
  });

  it('should sort data path descending', () => {
    fixture.detectChanges();
    component.onSortChanged('end');
    expect(component.currentSortPath).toBe('end');
    expect(component.order).toBe(-1); // initial is 1
  });
});
