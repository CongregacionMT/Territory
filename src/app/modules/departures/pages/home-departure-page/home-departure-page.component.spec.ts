import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';

import { HomeDeparturePageComponent } from './home-departure-page.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { DeparturePdfService } from '@core/services/departure-pdf.service';
import { getWeekId } from '@shared/utils/date-utils';

describe('HomeDeparturePageComponent', () => {
  let component: HomeDeparturePageComponent;
  let fixture: ComponentFixture<HomeDeparturePageComponent>;
  let mockTerritoryDataService: {
    getGroupList: ReturnType<typeof vi.fn>;
    getWeeklyDepartures: ReturnType<typeof vi.fn>;
    getWeeklyDeparture: ReturnType<typeof vi.fn>;
    getDepartures: ReturnType<typeof vi.fn>;
  };
  let mockPdfService: {
    getNextWeekId: ReturnType<typeof vi.fn>;
    getPrintWeekRange: ReturnType<typeof vi.fn>;
    getPrintRangeDescription: ReturnType<typeof vi.fn>;
    getDeparturesForPrintWeek: ReturnType<typeof vi.fn>;
    generateAllGroupsPdf: ReturnType<typeof vi.fn>;
    downloadPdf: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockTerritoryDataService = {
      getGroupList: vi.fn().mockReturnValue(of([{ id: 'Grupo 1' }, { id: 'Grupo 2' }])),
      getWeeklyDepartures: vi.fn().mockReturnValue(
        of([
          { weekId: '2026-09-28', departure: [] },
          { weekId: '2026-10-05', departure: [] },
        ]),
      ),
      getWeeklyDeparture: vi.fn().mockReturnValue(of({ departure: [] })),
      getDepartures: vi.fn().mockReturnValue(of({ departure: [] })),
    };

    mockPdfService = {
      getNextWeekId: vi.fn().mockImplementation((w: string) => {
        const d = new Date(w + 'T12:00:00');
        d.setDate(d.getDate() + 7);
        return getWeekId(d);
      }),
      getPrintWeekRange: vi.fn().mockReturnValue({
        friday: new Date(),
        thursday: new Date(),
        label: 'Viernes 9 de octubre al Jueves 15 de octubre',
      }),
      getDeparturesForPrintWeek: vi.fn().mockReturnValue([]),
      getPrintRangeDescription: vi.fn().mockReturnValue('viernes a jueves'),
      generateAllGroupsPdf: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      downloadPdf: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [HomeDeparturePageComponent],
      providers: [
        provideRouter([]),
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: DeparturePdfService, useValue: mockPdfService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeDeparturePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open print modal with current week selected', () => {
    const currentWeek = getWeekId(new Date());
    component.openPrintModal();

    expect(component.showPrintModal()).toBe(true);
    expect(component.selectedPrintWeekId()).toBe(currentWeek);
    expect(component.pdfGenerated()).toBe(false);
  });

  it('should navigate print weeks backward and forward', () => {
    const baseWeek = '2026-10-05';
    component.selectedPrintWeekId.set(baseWeek);

    component.navigatePrintWeek(-1);
    expect(component.selectedPrintWeekId()).toBe('2026-09-28');

    component.navigatePrintWeek(1);
    expect(component.selectedPrintWeekId()).toBe('2026-10-05');
  });

  it('should update selected week on dropdown select event', () => {
    const event = {
      target: { value: '2026-10-19' },
    } as unknown as Event;

    component.onPrintWeekSelect(event);
    expect(component.selectedPrintWeekId()).toBe('2026-10-19');
  });

  it('should compute future and past weeks appropriately', () => {
    const past = component.pastWeeks();
    const future = component.futureWeeks();

    expect(Array.isArray(past)).toBe(true);
    expect(Array.isArray(future)).toBe(true);
    expect(future.length).toBeGreaterThanOrEqual(3);
  });

  it('should print PDF successfully for selected week and download', async () => {
    component.selectedPrintWeekId.set('2026-10-12');
    component.printPdf('color');

    await Promise.resolve();

    expect(mockTerritoryDataService.getWeeklyDeparture).toHaveBeenCalledWith('2026-10-12');
    expect(mockPdfService.generateAllGroupsPdf).toHaveBeenCalled();
    expect(mockPdfService.downloadPdf).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      'salidas_2026-10-12_todos_color.pdf',
    );
    expect(component.pdfGenerated()).toBe(true);
    expect(component.isPrintingPdf()).toBe(false);

    vi.advanceTimersByTime(3000);
    expect(component.showPrintModal()).toBe(false);
  });
});
