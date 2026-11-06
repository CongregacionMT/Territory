import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { Departure, WeeklyDeparture } from '@core/models/Departures';
import { DepartureFormService } from './departure-form.service';

const departure = (overrides: Partial<Departure> = {}): Departure => ({
  driver: 'Ana',
  location: 'TerritorioW',
  territory: ['N°1'],
  date: '2026-11-10',
  maps: 'https://maps.example/plaza',
  point: 'Plaza',
  schedule: '18:30',
  color: 'info',
  group: 0,
  isEvent: false,
  title: '',
  cardStatus: 'received',
  departureId: 'old-id',
  ...overrides,
});

const week = (weekId: string, departures: Departure[]): WeeklyDeparture => ({
  weekId,
  departure: departures,
});

describe('DepartureFormService', () => {
  let service: DepartureFormService;

  beforeEach(() => {
    service = TestBed.inject(DepartureFormService);
  });

  describe('createWeekFromSource', () => {
    it('copies days, times and places a week forward', () => {
      const copy = service.createWeekFromSource(week('2026-11-02', [departure()]), '2026-11-09');

      expect(copy).toHaveLength(1);
      expect(copy[0]).toMatchObject({
        date: '2026-11-17',
        schedule: '18:30',
        point: 'Plaza',
        maps: 'https://maps.example/plaza',
        color: 'info',
        group: 0,
        location: 'TerritorioW',
      });
    });

    it('leaves drivers, territories and card progress empty', () => {
      const [copy] = service.createWeekFromSource(week('2026-11-02', [departure()]), '2026-11-09');

      expect(copy.driver).toBe('');
      expect(copy.territory).toEqual([]);
      expect(copy.cardStatus).toBe('pending');
      expect(copy.departureId).toBeUndefined();
    });

    it('does not carry events over and keeps chronological order', () => {
      const copy = service.createWeekFromSource(
        week('2026-11-02', [
          departure({ date: '2026-11-08', schedule: '10:00' }),
          departure({ date: '2026-11-03', isEvent: true, title: 'Conmemoración' }),
          departure({ date: '2026-11-03', schedule: '09:30' }),
        ]),
        '2026-11-09',
      );

      expect(copy.map((d) => d.date)).toEqual(['2026-11-10', '2026-11-15']);
      expect(copy.every((d) => !d.isEvent)).toBe(true);
    });
  });

  describe('findSourceWeek', () => {
    const history = [
      week('2026-11-16', [departure({ date: '2026-11-17' })]),
      week('2026-11-09', []),
      week('2026-11-02', [departure({ isEvent: true })]),
      week('2026-10-26', [departure({ date: '2026-10-27' })]),
      week('2026-10-19', [departure({ date: '2026-10-20' })]),
    ];

    it('skips empty weeks and weeks that only have events', () => {
      expect(service.findSourceWeek(history, '2026-11-16')?.weekId).toBe('2026-10-26');
    });

    it('never picks the target week or a later one', () => {
      expect(service.findSourceWeek(history, '2026-10-26')?.weekId).toBe('2026-10-19');
      expect(service.findSourceWeek(history, '2026-10-19')).toBeUndefined();
    });
  });

  describe('assignment status', () => {
    it('reports what is missing', () => {
      expect(service.getAssignmentStatus(departure())).toBe('complete');
      expect(service.getAssignmentStatus(departure({ driver: ' ' }))).toBe('missing-driver');
      expect(service.getAssignmentStatus(departure({ territory: [] }))).toBe('missing-territory');
      expect(service.getAssignmentStatus(departure({ driver: '', territory: [] }))).toBe(
        'missing-both',
      );
      expect(service.getAssignmentStatus(departure({ isEvent: true, driver: '' }))).toBe('event');
    });

    it('summarizes a whole week', () => {
      expect(service.getWeekFillState([])).toBe('empty');
      expect(service.getWeekFillState([departure(), departure({ driver: '' })])).toBe('incomplete');
      expect(service.getWeekFillState([departure(), departure({ isEvent: true })])).toBe(
        'complete',
      );
    });
  });

  describe('initForm', () => {
    it('lists departures chronologically and keeps their ids', () => {
      const form = service.createForm();
      service.initForm(
        form,
        [
          departure({ date: '2026-11-12', schedule: '09:30', departureId: 'b' }),
          departure({ date: '2026-11-10', schedule: '18:30', departureId: 'a' }),
        ],
        '2026-11-09',
      );

      const values = (form.get('departure0')?.value ?? []) as Departure[];
      expect(values.map((d) => d.departureId)).toEqual(['a', 'b']);
    });

    it('gives new departures an empty id so they are not mistaken for saved ones', () => {
      const form = service.createForm();
      service.addControl(form, 0, '2026-11-09');

      const [created] = form.get('departure0')?.value as Departure[];
      expect(created.departureId).toBe('');
    });
  });
});
