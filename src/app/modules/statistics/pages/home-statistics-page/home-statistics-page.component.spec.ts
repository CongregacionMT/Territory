import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeStatisticsPageComponent } from './home-statistics-page.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { Component, Input } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-card-xl',
  template: '',
  standalone: true,
})
class MockCardXlComponent {
  @Input() mapSRC: any;
  @Input() mapName: any;
}

describe('HomeStatisticsPageComponent', () => {
  let component: HomeStatisticsPageComponent;
  let fixture: ComponentFixture<HomeStatisticsPageComponent>;
  let mockTerritoryDataService: any;
  let mockSpinnerService: any;

  beforeEach(async () => {
    mockTerritoryDataService = {
      getCardTerritorie: vi.fn().mockReturnValue(of([{ applesData: [{ checked: true }] }])),
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [HomeStatisticsPageComponent, RouterTestingModule],
      providers: [
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: SpinnerService, useValue: mockSpinnerService },
      ],
    })
      .overrideComponent(HomeStatisticsPageComponent, {
        remove: { imports: [] }, // Keep everything that works
        add: { imports: [MockCardXlComponent] },
      })
      .compileComponents();
  });

  beforeEach(() => {
    sessionStorage.clear();
    // Simulate some environment data
    component = TestBed.createComponent(HomeStatisticsPageComponent).componentInstance;
    component.localities = [
      {
        name: 'Wheelwright',
        key: 'wheelwright',
        territoryPrefix: 'Territorio',
        storageKey: 'stat_ww',
        hasNumberedTerritories: true,
      },
    ];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize data and load statistics for localities', async () => {
    // Provide numberTerritory so it loads statistics
    sessionStorage.setItem(
      'numberTerritory',
      JSON.stringify({
        wheelwright: [{ collection: 'coll1', territorio: 1 }],
      }),
    );

    fixture = TestBed.createComponent(HomeStatisticsPageComponent);
    component = fixture.componentInstance;
    component.localities = [
      {
        name: 'Wheelwright',
        key: 'wheelwright',
        territoryPrefix: 'Territorio',
        storageKey: 'stat_ww',
        hasNumberedTerritories: true,
      },
    ];

    fixture.detectChanges(); // calls ngOnInit

    expect(mockSpinnerService.cargarSpinner).toHaveBeenCalled();
    expect(mockTerritoryDataService.getCardTerritorie).toHaveBeenCalledWith('coll1');

    // Wait for promises to resolve
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();

    const key = component.getStorageKeyForLocality('wheelwright');
    expect(sessionStorage.getItem(key)).toBeTruthy();
  });

  it('should get storage key correctly', () => {
    fixture = TestBed.createComponent(HomeStatisticsPageComponent);
    component = fixture.componentInstance;

    const key = component.getStorageKeyForLocality('maria-teresa');
    expect(key).toBe('statisticDataMariateresa_12');
  });

  it('should not load statistics if already in sessionStorage', async () => {
    fixture = TestBed.createComponent(HomeStatisticsPageComponent);
    component = fixture.componentInstance;

    const key = component.getStorageKeyForLocality('wheelwright');
    sessionStorage.setItem(key, '[]');

    await component.loadStatisticsForLocality({
      name: 'Wheelwright',
      key: 'wheelwright',
      territoryPrefix: 'T',
      storageKey: 'S',
      hasNumberedTerritories: true,
    });

    expect(mockTerritoryDataService.getCardTerritorie).not.toHaveBeenCalled();
  });
});
