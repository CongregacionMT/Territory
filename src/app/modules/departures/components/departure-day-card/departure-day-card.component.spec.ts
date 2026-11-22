import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { DepartureDayCardComponent } from './departure-day-card.component';

const buildGroup = (overrides: Record<string, unknown> = {}): FormGroup =>
  new FormGroup({
    departureId: new FormControl(''),
    date: new FormControl('2026-11-10'),
    driver: new FormControl(''),
    schedule: new FormControl('18:30'),
    location: new FormControl('TerritorioW'),
    territory: new FormArray([new FormControl('N°5'), new FormControl('N°7')]),
    point: new FormControl(''),
    maps: new FormControl(''),
    color: new FormControl('light'),
    group: new FormControl(0),
    isEvent: new FormControl(false),
    title: new FormControl(''),
    cardStatus: new FormControl('pending'),
    ...overrides,
  });

describe('DepartureDayCardComponent', () => {
  let fixture: ComponentFixture<DepartureDayCardComponent>;
  let component: DepartureDayCardComponent;
  let group: FormGroup;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DepartureDayCardComponent] });
    group = buildGroup();
    fixture = TestBed.createComponent(DepartureDayCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('dayFormGroup', group);
    fixture.componentRef.setInput('index', 0);
    fixture.componentRef.setInput('groupIndex', 0);
    fixture.detectChanges();
  });

  it('titles the card with the full date and time', () => {
    expect(component.title).toBe('Martes 10 nov · 18:30');
    expect(fixture.nativeElement.querySelector('h3').textContent).toContain('Martes 10 nov');
  });

  it('shows colors the public page cannot paint as gray', () => {
    expect(component.colorValue).toBe('secondary');
    component.setColor('success');
    expect(component.colorValue).toBe('success');
    expect(group.get('color')?.dirty).toBe(true);
  });

  it('removes a single territory and marks the form as edited', () => {
    component.removeTerritory('N°5');

    expect(component.getTerritories()).toEqual(['N°7']);
    expect(group.dirty).toBe(true);
  });

  it('repaints when the territories change from outside (the selection modal)', () => {
    (group.get('territory') as FormArray).push(new FormControl('N°9'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('N°9');
  });

  it('turns an event into a card without territories', () => {
    const event = { target: { checked: true } } as unknown as Event;

    component.onChangeCheckbox(event, 'isEvent');

    expect(component.getTerritories()).toEqual([]);
    expect(group.get('cardStatus')?.value).toBe('not_required');
  });

  it('shows every option of the departure without having to expand anything', () => {
    const text = fixture.nativeElement.textContent as string;

    [
      'Fecha',
      'Horario',
      'Conductor',
      'Territorios',
      'Punto de encuentro',
      'Mapa',
      'Color',
      'Evento',
    ].forEach((label) => expect(text).toContain(label));
    expect(fixture.nativeElement.querySelectorAll('[role="radio"]')).toHaveLength(6);
  });

  it('only shows the locality when there is more than one to choose from', () => {
    const locality = { key: 'a', name: 'A', territoryPrefix: 'TerritorioW' };
    const hasField = (): boolean => !!fixture.nativeElement.querySelector('[id$="-location"]');

    fixture.componentRef.setInput('localities', [locality]);
    fixture.detectChanges();
    expect(hasField()).toBe(false);

    fixture.componentRef.setInput('localities', [locality, { ...locality, key: 'b' }]);
    fixture.detectChanges();
    expect(hasField()).toBe(true);
  });

  it('offers copy and remove from the actions menu and closes it afterwards', () => {
    const copied = vi.fn();
    const removed = vi.fn();
    component.dayCopy.subscribe(copied);
    component.delete.subscribe(removed);

    component.toggleMenu();
    component.onCopy();
    component.toggleMenu();
    component.onDelete();

    expect(copied).toHaveBeenCalledTimes(1);
    expect(removed).toHaveBeenCalledTimes(1);
    expect(component.menuOpen()).toBe(false);
  });

  it('only suggests a meeting point that differs from the current one', () => {
    fixture.componentRef.setInput('suggestedPoint', 'Plaza');
    expect(component.showSuggestedPoint).toBe(true);

    group.get('point')?.setValue('Plaza');
    expect(component.showSuggestedPoint).toBe(false);
  });
});
