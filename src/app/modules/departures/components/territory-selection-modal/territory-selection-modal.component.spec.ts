import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it, beforeEach } from 'vitest';
import { TerritorySelectionModalComponent } from './territory-selection-modal.component';

const departure = (
  location: string,
  date: string,
  schedule: string,
  territories: string[],
): FormGroup =>
  new FormGroup({
    location: new FormControl(location),
    date: new FormControl(date),
    schedule: new FormControl(schedule),
    territory: new FormArray(territories.map((t) => new FormControl(t))),
  });

describe('TerritorySelectionModalComponent', () => {
  const PREFIX = 'TerritorioW';
  let fixture: ComponentFixture<TerritorySelectionModalComponent>;
  let component: TerritorySelectionModalComponent;
  let editing: FormGroup;
  let numbers: string[];

  const open = (inputs: Record<string, unknown> = {}): void => {
    fixture = TestBed.createComponent(TerritorySelectionModalComponent);
    component = fixture.componentInstance;
    const defaults: Record<string, unknown> = {
      activeModalDays: editing,
      dayIndex: 0,
      groupKey: 0,
      formDeparture: new FormGroup({
        departure0: new FormArray([editing, departure(PREFIX, '2026-11-12', '18:30', ['N°3'])]),
      }),
      territoryLastCompletedDays: { [PREFIX]: { 1: 100, 2: 10, 3: 200, 4: 50 } },
      territoryGroupsMap: { [PREFIX]: { 1: 1, 2: 1, 3: 2 } },
      territoryNumbersCache: { [PREFIX]: numbers },
      personalAssignments: [],
      localities: [{ key: 'w', name: 'W', territoryPrefix: PREFIX, hasNumberedTerritories: true }],
    };
    Object.entries({ ...defaults, ...inputs }).forEach(([name, value]) =>
      fixture.componentRef.setInput(name, value),
    );
    fixture.detectChanges();
  };

  beforeEach(() => {
    numbers = ['N°1', 'N°2', 'N°3', 'N°4'];
    editing = departure(PREFIX, '2026-11-10', '09:30', []);
    TestBed.configureTestingModule({ imports: [TerritorySelectionModalComponent] });
  });

  it('opens already filtered by the group of the departure', () => {
    open({ initialGroupFilter: 1 });

    expect(component.selectedTerritoryGroup).toBe(1);
    expect([...component.getFilteredTerritoryList()].sort((a, b) => a.localeCompare(b))).toEqual([
      'N°1',
      'N°2',
    ]);
  });

  it('shows every territory when the departure has no group', () => {
    open({ initialGroupFilter: null });
    expect(component.getFilteredTerritoryList()).toHaveLength(4);
  });

  it('searches by number', () => {
    open();
    component.onSearch({ target: { value: '4' } } as unknown as Event);

    expect(component.getFilteredTerritoryList()).toEqual(['N°4']);
  });

  it('orders without reordering the list shared with the rest of the screen', () => {
    open();

    const ordered = component.getFilteredTerritoryList();

    expect(ordered[0]).toBe('N°1');
    expect(numbers).toEqual(['N°1', 'N°2', 'N°3', 'N°4']);
  });

  it('says where a territory is already used this week', () => {
    open();

    expect(component.getTerritoryUsageLabel('N°3')).toBe('Usado el jueves 18:30');
    expect(component.getTerritoryUsageLabel('N°1')).toBe('');
    expect(component.isTerritoryUsedInWeek('N°3')).toBe(true);
  });

  it('counts the selected territories and names the departure it is for', () => {
    open({ departureTitle: 'Martes 10 nov · 09:30' });
    component.handleCheckboxChange({ target: { checked: true } } as unknown as Event, 'N°2');

    expect(component.getSelectedCount()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Para: Martes 10 nov · 09:30');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('closes with Escape', () => {
    open();
    let closed = false;
    component.modalClose.subscribe(() => (closed = true));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closed).toBe(true);
  });
});
