import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { Departure } from '@core/models/Departures';
import { DeparturePdfService } from './departure-pdf.service';

const mockEnvironment = vi.hoisted(() => ({
  environment: { congregationName: 'Test', meetingDay: 4 },
}));

vi.mock('@environments/environment', () => mockEnvironment);

const toIso = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const buildDeparture = (date: string): Departure => ({
  driver: 'Driver',
  location: 'Loc',
  territory: [],
  date,
  maps: '',
  point: 'Point',
  schedule: '09:00',
  color: '',
  group: 0,
});

describe('DeparturePdfService - print range', () => {
  let service: DeparturePdfService;

  beforeEach(() => {
    mockEnvironment.environment.meetingDay = 4;
    TestBed.configureTestingModule({ providers: [DeparturePdfService] });
    service = TestBed.inject(DeparturePdfService);
  });

  it('should keep the Friday-to-Thursday range for a Thursday meeting', () => {
    const range = service.getPrintWeekRange('2026-10-05');

    expect(toIso(range.start)).toBe('2026-10-09');
    expect(toIso(range.end)).toBe('2026-10-15');
    expect(range.label).toBe('Viernes 9 de octubre al Jueves 15 de octubre');
    expect(service.getPrintRangeDescription()).toBe('viernes a jueves');
  });

  it('should shift the range for a Tuesday meeting', () => {
    mockEnvironment.environment.meetingDay = 2;

    const range = service.getPrintWeekRange('2026-10-05');

    expect(toIso(range.start)).toBe('2026-10-07');
    expect(toIso(range.end)).toBe('2026-10-13');
    expect(service.getPrintRangeDescription()).toBe('miércoles a martes');
  });

  it('should handle a Sunday meeting within the two fetched weeks', () => {
    mockEnvironment.environment.meetingDay = 0;

    const range = service.getPrintWeekRange('2026-10-05');

    expect(toIso(range.start)).toBe('2026-10-12');
    expect(toIso(range.end)).toBe('2026-10-18');
    expect(service.getPrintRangeDescription()).toBe('lunes a domingo');
  });

  it('should fall back to Thursday when the configured day is invalid', () => {
    mockEnvironment.environment.meetingDay = 9;

    expect(service.getMeetingDay()).toBe(4);
  });

  it('should filter departures using the configured range', () => {
    mockEnvironment.environment.meetingDay = 2;

    const current = [buildDeparture('2026-10-06'), buildDeparture('2026-10-07')];
    const next = [buildDeparture('2026-10-13'), buildDeparture('2026-10-14')];

    const result = service.getDeparturesForPrintWeek(current, next, '2026-10-05');

    expect(result.map((d) => d.date)).toEqual(['2026-10-07', '2026-10-13']);
  });

  it('should render a multi-page PDF for several groups', async () => {
    const departures = Array.from({ length: 60 }, (_, i) => ({
      ...buildDeparture(`2026-10-${String(9 + (i % 7)).padStart(2, '0')}`),
      group: (i % 3) + 1,
    }));

    const bytes = await service.generateAllGroupsPdf(departures, 'Label', 'bw', [1, 2, 3]);

    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
  });
});
