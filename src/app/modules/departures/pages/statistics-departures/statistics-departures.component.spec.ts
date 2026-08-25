import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatisticsDeparturesComponent } from './statistics-departures.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@shared/utils/date-utils', () => ({
  formatWeekRange: vi.fn((date) => `formatted-${date}`)
}));

describe('StatisticsDeparturesComponent', () => {
  let component: StatisticsDeparturesComponent;
  let fixture: ComponentFixture<StatisticsDeparturesComponent>;
  let mockTerritoryDataService: any;
  let mockSpinnerService: any;

  beforeEach(async () => {
    mockTerritoryDataService = {
      getWeeklyDepartures: vi.fn().mockReturnValue(of([
        {
          weekId: '2023-W02',
          departure: [
            { driver: 'John Doe', point: 'Central Station' },
            { driver: 'Jane Doe', point: 'Central Station' }
          ]
        },
        {
          weekId: '2023-W01',
          departure: [
            { driver: 'John Doe', point: 'North Park' }
          ]
        }
      ]))
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [StatisticsDeparturesComponent],
      providers: [
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: SpinnerService, useValue: mockSpinnerService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticsDeparturesComponent);
    component = fixture.componentInstance;
  });

  it('should create and process stats on init', () => {
    fixture.detectChanges(); // calls ngOnInit

    expect(component).toBeTruthy();
    expect(mockSpinnerService.cargarSpinner).toHaveBeenCalled();
    expect(mockTerritoryDataService.getWeeklyDepartures).toHaveBeenCalled();
    
    // Check driver stats processing
    expect(component.driverStats.length).toBe(2);
    expect(component.driverStats[0]).toEqual({ name: 'John Doe', count: 2 });
    expect(component.driverStats[1]).toEqual({ name: 'Jane Doe', count: 1 });

    // Check point stats processing
    expect(component.pointStats.length).toBe(2);
    // '2023-W01' is alphabetically less than '2023-W02', so it comes last when sorting desc
    expect(component.pointStats[0]).toEqual({ name: 'Central Station', lastDate: '2023-W02' });
    expect(component.pointStats[1]).toEqual({ name: 'North Park', lastDate: '2023-W01' });
    
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
  });

  it('should format date', () => {
    expect(component.getFormattedDate('2023-W01')).toBe('formatted-2023-W01');
  });

  it('should handle error from service', () => {
    mockTerritoryDataService.getWeeklyDepartures.mockReturnValue(throwError(() => new Error('Error')));
    fixture.detectChanges();
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
    expect(component.weeklyDepartures).toEqual([]);
  });
});
