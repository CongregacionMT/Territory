import { Component, input, output, ChangeDetectionStrategy, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { AbstractControl, FormGroup, FormArray, FormControl } from '@angular/forms';
import { Card } from '@core/models/Card';
import { LocalityConfig } from '@core/models/LocalityData';
import { formatDaysAgo } from '@shared/utils/territory-age.utils';
import { getWeekdayName } from '@shared/utils/departure-format.utils';

@Component({
  selector: 'app-territory-selection-modal',
  imports: [NgClass, CdkTrapFocus],
  templateUrl: './territory-selection-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closeModal()' },
})
export class TerritorySelectionModalComponent implements OnInit {
  // Inputs
  activeModalDays = input.required<FormGroup>();
  dayIndex = input.required<number>();
  groupKey = input.required<number>();
  formDeparture = input.required<FormGroup>();

  territoryLastCompletedDays = input.required<Record<string, Record<number, number>>>();
  territoryCompletionDataStatus = input<Record<string, 'loading' | 'ready' | 'error'>>({});
  territoryGroupsMap = input.required<Record<string, Record<number, number>>>();
  territoryNumbersCache = input.required<Record<string, string[]>>();
  personalAssignments = input.required<Card[]>();
  localities = input.required<LocalityConfig[]>();
  /** "Martes 10 nov · 18:30 · Grupo 1": tells which departure the territories are for. */
  departureTitle = input<string>('');
  /** Group the list opens filtered by (the group of the departure being edited). */
  initialGroupFilter = input<number | null>(null);

  // Outputs
  modalClose = output<void>();

  // State
  sortByAge = true;
  showPersonalTerritories = true;
  selectedTerritoryGroup: number | null = null;
  searchTerm = '';

  readonly ageLegend = [
    { label: 'Nunca o más de 8 sem', dotClass: 'bg-red-500' },
    { label: '6 a 8 sem', dotClass: 'bg-amber-500' },
    { label: '4 a 6 sem', dotClass: 'bg-sky-500' },
    { label: 'Menos de 4 sem', dotClass: 'bg-emerald-500' },
  ];

  ngOnInit(): void {
    this.selectedTerritoryGroup = this.initialGroupFilter();
  }

  locationPrefix = computed<string>(() => {
    return String(this.activeModalDays().get('location')?.value ?? '');
  });

  getAvailableGroupNumbers(): number[] {
    const locGroups = this.territoryGroupsMap()[this.locationPrefix()];
    if (!locGroups) return [];
    const groups = new Set(Object.values(locGroups).filter((g) => g > 0));
    return Array.from(groups).sort((a, b) => a - b);
  }

  getFilteredTerritoryList(): string[] {
    const locPrefix = this.locationPrefix();
    if (!locPrefix) return [];

    // Copy: the list below is sorted in place and must never reorder the shared cache.
    const list = this.filterTerritories([...this.getTerritoryList(locPrefix)], locPrefix);

    const completionStatus = this.territoryCompletionDataStatus()[locPrefix];
    const canSortByAge = !completionStatus || completionStatus === 'ready';
    return this.sortByAge && canSortByAge ? this.sortByPriority(list, locPrefix) : list;
  }

  private filterTerritories(list: string[], locPrefix: string): string[] {
    const term = this.searchTerm.trim().toLowerCase();

    return list.filter((num) => {
      if (term && !num.toLowerCase().includes(term)) return false;

      const group = this.selectedTerritoryGroup;
      if (group !== null && this.getTerritoryGroupNumber(num, locPrefix) !== group) return false;

      const hiddenPersonal =
        !this.showPersonalTerritories &&
        this.isPersonalTerritory(num, locPrefix) &&
        !this.isTerritoryChecked(num);
      return !hiddenPersonal;
    });
  }

  private sortByPriority(list: string[], locPrefix: string): string[] {
    return list.sort((a, b) => {
      const aUsed = this.isTerritoryUsedInWeek(a) ? 1 : 0;
      const bUsed = this.isTerritoryUsedInWeek(b) ? 1 : 0;
      if (aUsed !== bUsed) return aUsed - bUsed;

      const aPersonal =
        this.isPersonalTerritory(a, locPrefix) && !this.isTerritoryChecked(a) ? 1 : 0;
      const bPersonal =
        this.isPersonalTerritory(b, locPrefix) && !this.isTerritoryChecked(b) ? 1 : 0;
      if (aPersonal !== bPersonal) return aPersonal - bPersonal;

      return (
        this.getTerritoryLastUsedDays(b, locPrefix) - this.getTerritoryLastUsedDays(a, locPrefix)
      );
    });
  }

  getTerritoryList(locationPrefix: string): string[] {
    const loc = this.localities().find((l) => l.territoryPrefix === locationPrefix);
    if (!loc) return [];
    if (loc.hasNumberedTerritories) {
      return this.territoryNumbersCache()[locationPrefix] || [];
    }
    // Return default unnumbered ones if not found (e.g. personal, letter)
    return ['Personal', 'Tel/Carta'];
  }

  getTerritoryGroupNumber(num: string, locationPrefix: string): number {
    const numericNum = this.normalizeTerritoryNumber(num);
    if (numericNum !== -1 && this.territoryGroupsMap()[locationPrefix]?.[numericNum]) {
      return this.territoryGroupsMap()[locationPrefix][numericNum];
    }
    return 0;
  }

  isPersonalTerritory(num: string, locationPrefix: string): boolean {
    const territoryNumber = this.normalizeTerritoryNumber(num);
    const locationNames = this.getLocationNames(locationPrefix);

    return this.personalAssignments().some((assignment) => {
      const assignedTerritory = this.normalizeTerritoryNumber(
        String(assignment.territory || assignment.territoryNumber || ''),
      );
      const assignedLocation = String(assignment.location || '').toLowerCase();

      return (
        assignedTerritory === territoryNumber &&
        locationNames.some((name) => assignedLocation.includes(name))
      );
    });
  }

  isTerritoryChecked(num: string): boolean {
    const territoryArray = this.activeModalDays().get('territory') as FormArray<
      FormControl<string>
    > | null;
    if (!territoryArray) return false;
    const values = territoryArray.value || [];
    return values.includes(num);
  }

  handleCheckboxChange(event: Event, num: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    const territoryArray = this.activeModalDays().get('territory') as FormArray<
      FormControl<string>
    > | null;
    if (!territoryArray) return;

    this.activeModalDays().get('territory')?.markAsDirty();

    const values = territoryArray.value || [];
    if (checked) {
      if (!values.includes(num)) {
        territoryArray.push(new FormControl(num, { nonNullable: true }));
      }
    } else {
      const index = values.findIndex((val: string) => val === num);
      if (index >= 0) {
        territoryArray.removeAt(index);
      }
    }
  }

  isTerritoryUsedInWeek(num: string): boolean {
    return this.findOtherDepartureUsing(num) !== null;
  }

  /** "Usado el jueves 18:30" when another departure of the week already has this territory. */
  getTerritoryUsageLabel(num: string): string {
    const other = this.findOtherDepartureUsing(num);
    if (!other) return '';

    const weekday = getWeekdayName(other.date).toLowerCase();
    const when = [weekday, other.schedule].filter(Boolean).join(' ');
    return when ? `Usado el ${when}` : 'Usado en otra salida';
  }

  getSelectedCount(): number {
    const territoryArray = this.activeModalDays().get('territory') as FormArray | null;
    return ((territoryArray?.value as string[] | undefined) ?? []).length;
  }

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
  }

  private findOtherDepartureUsing(num: string): { date: string; schedule: string } | null {
    const locPrefix = this.locationPrefix();

    const match = this.getOtherDepartureControls().find(
      (control) =>
        String(control.get('location')?.value ?? '') === locPrefix &&
        ((control.get('territory')?.value as string[] | null) ?? []).includes(num),
    );
    if (!match) return null;

    return {
      date: String(match.get('date')?.value ?? ''),
      schedule: String(match.get('schedule')?.value ?? ''),
    };
  }

  /** Every departure control in the form except the one being edited. */
  private getOtherDepartureControls(): AbstractControl[] {
    const form = this.formDeparture();

    return Object.keys(form.controls)
      .filter((key) => key.startsWith('departure'))
      .flatMap((key) => {
        const groupIndex = parseInt(key.replace('departure', ''), 10);
        const formArray = form.get(key) as FormArray | null;
        return (formArray?.controls ?? []).filter(
          (_control, index) => !(groupIndex === this.groupKey() && index === this.dayIndex()),
        );
      });
  }

  getTerritoryLastUsedDays(num: string, locationPrefix: string): number {
    const numericNum = this.normalizeTerritoryNumber(num);
    if (
      numericNum !== -1 &&
      this.territoryLastCompletedDays()[locationPrefix]?.[numericNum] !== undefined
    ) {
      return this.territoryLastCompletedDays()[locationPrefix][numericNum];
    }
    return Infinity;
  }

  getTerritoryAgeLabel(num: string, locationPrefix: string): string {
    const completionStatus = this.territoryCompletionDataStatus()[locationPrefix];
    const days = this.getTerritoryLastUsedDays(num, locationPrefix);
    if (completionStatus === 'loading' && !isFinite(days)) return 'Actualizando…';
    if (completionStatus === 'error' && !isFinite(days)) return 'Error al actualizar';
    if (!isFinite(days)) return 'Nunca';

    const label = formatDaysAgo(days);
    return completionStatus === 'error' ? `${label} (sin actualizar)` : label;
  }

  getTerritoryPriorityColor(num: string, locationPrefix: string): string {
    const days = this.getTerritoryLastUsedDays(num, locationPrefix);
    if (!isFinite(days) || days >= 57) return 'danger';
    if (days >= 43) return 'warning';
    if (days >= 29) return 'primary';
    return 'success';
  }

  getPriorityColorClass(num: string, locationPrefix: string): string {
    const completionStatus = this.territoryCompletionDataStatus()[locationPrefix];
    const isUnknown = !isFinite(this.getTerritoryLastUsedDays(num, locationPrefix));
    if (isUnknown && (completionStatus === 'loading' || completionStatus === 'error')) {
      return 'border-l-[6px] border-l-slate-500 border-slate-700/50 bg-slate-800/80 hover:bg-slate-700/80';
    }

    const color = this.getTerritoryPriorityColor(num, locationPrefix);
    switch (color) {
      case 'danger':
        return 'border-l-[6px] border-l-red-500 border-red-500/30 bg-red-500/10 hover:bg-red-500/20';
      case 'warning':
        return 'border-l-[6px] border-l-amber-500 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20';
      case 'primary':
        return 'border-l-[6px] border-l-sky-500 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20';
      case 'success':
        return 'border-l-[6px] border-l-emerald-500 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20';
      default:
        return 'border-l-[6px] border-l-slate-500 border-slate-700/50 bg-slate-800/80 hover:bg-slate-700/80';
    }
  }

  getTerritoryLink(locationPrefix: string, territoryNumber: string): string {
    if (
      territoryNumber.toLowerCase() === 'personal' ||
      territoryNumber.toLowerCase() === 'tel/carta'
    ) {
      return '#';
    }
    const cleanNumber = territoryNumber.replace(/\D/g, '');
    return `${window.location.origin}/territorios/${locationPrefix}-${cleanNumber}`;
  }

  closeModal(): void {
    this.modalClose.emit();
  }

  private normalizeTerritoryNumber(value: string): number {
    const match = /\d+/.exec(String(value));
    return match ? Number(match[0]) : -1;
  }

  private getLocationNames(locationPrefix: string): string[] {
    const location = String(locationPrefix || '').toLowerCase();
    const locality = this.localities().find(
      (loc) =>
        String(loc.territoryPrefix || '').toLowerCase() === location ||
        String(loc.key || '').toLowerCase() === location ||
        String(loc.name || '').toLowerCase() === location,
    );

    return [
      location,
      String(locality?.key || '').toLowerCase(),
      String(locality?.name || '').toLowerCase(),
      String(locality?.territoryPrefix || '').toLowerCase(),
    ].filter(Boolean);
  }
}
