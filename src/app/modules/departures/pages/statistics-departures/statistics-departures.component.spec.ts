import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StatisticsDeparturesComponent } from './statistics-departures.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@shared/utils/date-utils', () => ({
  formatWeekRange: vi.fn((date) => `formatted-${date}`),
}));

describe('StatisticsDeparturesComponent', () => {
  let component: StatisticsDeparturesComponent;
  let fixture: ComponentFixture<StatisticsDeparturesComponent>;
  let mockTerritoryDataService: Record<string, ReturnType<typeof vi.fn>>;
  let mockSpinnerService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    mockTerritoryDataService = {
      getWeeklyDepartures: vi.fn().mockReturnValue(
        of([
          {
            weekId: '2023-W02',
            departure: [
              { driver: 'John Doe', point: 'Central Station' },
              { driver: 'Jane Doe', point: 'Central Station' },
            ],
          },
          {
            weekId: '2023-W01',
            departure: [{ driver: 'John Doe', point: 'North Park' }],
          },
        ]),
      ),
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [StatisticsDeparturesComponent],
      providers: [
        provideRouter([]),
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: SpinnerService, useValue: mockSpinnerService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticsDeparturesComponent);
    component = fixture.componentInstance;
  });

  it('should create and process stats on init', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(mockTerritoryDataService.getWeeklyDepartures).toHaveBeenCalled();

    // Check driver stats processing
    expect(component.driverStats().length).toBe(2);
    expect(component.driverStats()[0]).toEqual({ name: 'John Doe', count: 2, percentage: 67 });
    expect(component.driverStats()[1]).toEqual({ name: 'Jane Doe', count: 1, percentage: 33 });

    // Check point stats processing
    expect(component.pointStats().length).toBe(2);
    expect(component.pointStats()[0]).toEqual({
      name: 'Central Station',
      lastDate: '2023-W02',
      count: 2,
    });
    expect(component.pointStats()[1]).toEqual({
      name: 'North Park',
      lastDate: '2023-W01',
      count: 1,
    });

    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
  });

  it('should format date', () => {
    expect(component.getFormattedDate('2023-W01')).toBe('formatted-2023-W01');
  });

  it('should handle error from service', () => {
    mockTerritoryDataService.getWeeklyDepartures.mockReturnValue(
      throwError(() => new Error('Error')),
    );
    const errFixture = TestBed.createComponent(StatisticsDeparturesComponent);
    const errComponent = errFixture.componentInstance;
    errFixture.detectChanges();
    expect(errComponent.weeklyDepartures()).toEqual([]);
  });
});
