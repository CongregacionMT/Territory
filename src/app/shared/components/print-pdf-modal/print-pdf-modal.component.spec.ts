import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrintPdfModalComponent } from './print-pdf-modal.component';
import { DeparturePdfService } from '@core/services/departure-pdf.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of, throwError } from 'rxjs';

// Hoist vi.mock to the top
vi.mock('@shared/utils/date-utils', () => ({
  getWeekId: vi.fn().mockReturnValue('2023-W01')
}));

describe('PrintPdfModalComponent', () => {
  let component: PrintPdfModalComponent;
  let fixture: ComponentFixture<PrintPdfModalComponent>;
  let mockPdfService: any;
  let mockTerritoryDataService: any;

  beforeEach(async () => {
    mockPdfService = {
      getNextWeekId: vi.fn().mockReturnValue('2023-W02'),
      getPrintWeekRange: vi.fn().mockReturnValue({ label: 'Range Label' }),
      getDeparturesForPrintWeek: vi.fn().mockReturnValue([]),
      generateAllGroupsPdf: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      downloadPdf: vi.fn()
    };

    mockTerritoryDataService = {
      getWeeklyDeparture: vi.fn().mockReturnValue(of({ departure: [] })),
      getDepartures: vi.fn().mockReturnValue(of({ departure: [] }))
    };

    await TestBed.configureTestingModule({
      imports: [PrintPdfModalComponent],
      providers: [
        { provide: DeparturePdfService, useValue: mockPdfService },
        { provide: TerritoryDataService, useValue: mockTerritoryDataService }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintPdfModalComponent);
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

  it('should emit close event', () => {
    vi.spyOn(component.close, 'emit');
    component.closeModal();
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should print PDF successfully', async () => {
    vi.spyOn(component.close, 'emit');
    
    // Since printPdf has a nested async structure with forkJoin and await, 
    // we need to await the printPdf completion or allow event loop to tick.
    await component.printPdf('color');
    
    // Flush microtasks
    await Promise.resolve();

    expect(mockPdfService.generateAllGroupsPdf).toHaveBeenCalled();
    expect(mockPdfService.downloadPdf).toHaveBeenCalled();
    expect(component.isPrintingPdf()).toBe(false);
    expect(component.pdfGenerated()).toBe(true);

    // Advance time by 3 seconds
    vi.advanceTimersByTime(3000);
    
    expect(component.pdfGenerated()).toBe(false);
    expect(component.close.emit).toHaveBeenCalled();
  });

  it('should handle error when fetching departures', async () => {
    mockTerritoryDataService.getWeeklyDeparture.mockReturnValue(throwError(() => new Error('Test error')));
    
    await component.printPdf('bn');

    expect(component.isPrintingPdf()).toBe(false);
    expect(mockPdfService.generateAllGroupsPdf).not.toHaveBeenCalled();
  });
  
  it('should handle error during PDF generation', async () => {
    mockPdfService.generateAllGroupsPdf.mockRejectedValue(new Error('PDF error'));
    
    await component.printPdf('color');

    // Wait for the async inside subscribe to reject
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(component.isPrintingPdf()).toBe(false);
    expect(mockPdfService.downloadPdf).not.toHaveBeenCalled();
  });
});
