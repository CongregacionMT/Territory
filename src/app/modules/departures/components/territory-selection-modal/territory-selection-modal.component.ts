import { Component, input, output, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, FormControl } from '@angular/forms';
import { Card } from '@core/models/Card';
import { LocalityConfig } from '@core/models/LocalityData';

@Component({
  selector: 'app-territory-selection-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './territory-selection-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerritorySelectionModalComponent {
  // Inputs
  activeModalDays = input.required<FormGroup>();
  dayIndex = input.required<number>();
  groupKey = input.required<number>();
  formDeparture = input.required<FormGroup>();

  territoryLastCompletedDays = input.required<Record<string, Record<number, number>>>();
  territoryGroupsMap = input.required<Record<string, Record<number, number>>>();
  territoryNumbersCache = input.required<Record<string, string[]>>();
  personalAssignments = input.required<Card[]>();
  localities = input.required<LocalityConfig[]>();

  // Outputs
  modalClose = output<void>();

  // State
  sortByAge = true;
  showPersonalTerritories = true;
  selectedTerritoryGroup: number | null = null;

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

    let list = this.getTerritoryList(locPrefix);

    if (this.selectedTerritoryGroup !== null) {
      list = list.filter(
        (num) => this.getTerritoryGroupNumber(num, locPrefix) === this.selectedTerritoryGroup,
      );
    }

    if (!this.showPersonalTerritories) {
      list = list.filter((num) => {
        if (this.isPersonalTerritory(num, locPrefix)) {
          return this.isTerritoryChecked(num);
        }
        return true;
      });
    }

    if (this.sortByAge) {
      list.sort((a, b) => {
        const aUsed = this.isTerritoryUsedInWeek(a) ? 1 : 0;
        const bUsed = this.isTerritoryUsedInWeek(b) ? 1 : 0;
        if (aUsed !== bUsed) return aUsed - bUsed;

        const aPersonal =
          this.isPersonalTerritory(a, locPrefix) && !this.isTerritoryChecked(a) ? 1 : 0;
        const bPersonal =
          this.isPersonalTerritory(b, locPrefix) && !this.isTerritoryChecked(b) ? 1 : 0;
        if (aPersonal !== bPersonal) return aPersonal - bPersonal;

        const ageA = this.getTerritoryLastUsedDays(a, locPrefix);
        const ageB = this.getTerritoryLastUsedDays(b, locPrefix);
        return ageB - ageA;
      });
    }

    return list;
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
    const numericNum = Number(num);
    if (!isNaN(numericNum) && this.territoryGroupsMap()[locationPrefix]?.[numericNum]) {
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
    this.activeModalDays().get('territory')?.markAsDirty();
  }

  isTerritoryUsedInWeek(num: string): boolean {
    const locPrefix = this.locationPrefix();
    let isUsed = false;

    Object.keys(this.formDeparture().controls).forEach((key) => {
      if (key.startsWith('departure')) {
        const groupIndex = parseInt(key.replace('departure', ''), 10);
        const formArray = this.formDeparture().get(key) as FormArray | null;
        if (!formArray) return;

        formArray.controls.forEach((groupControl, i) => {
          if (groupIndex === this.groupKey() && i === this.dayIndex()) return;

          const controlLocation = String(groupControl.get('location')?.value ?? '');
          if (controlLocation === locPrefix) {
            const territoryVals = (groupControl.get('territory')?.value as string[]) || [];
            if (territoryVals.includes(num)) {
              isUsed = true;
            }
          }
        });
      }
    });
    return isUsed;
  }

  getTerritoryLastUsedDays(num: string, locationPrefix: string): number {
    const numericNum = Number(num);
    if (!isNaN(numericNum) && this.territoryLastCompletedDays()[locationPrefix]?.[numericNum]) {
      return this.territoryLastCompletedDays()[locationPrefix][numericNum];
    }
    return Infinity;
  }

  getTerritoryAgeLabel(num: string, locationPrefix: string): string {
    const days = this.getTerritoryLastUsedDays(num, locationPrefix);
    if (!isFinite(days)) return 'Nunca';
    if (days < 7) return `Hace ${days}d`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem`;
    const months = Math.floor(days / 30);
    return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  }

  getTerritoryPriorityColor(num: string, locationPrefix: string): string {
    const days = this.getTerritoryLastUsedDays(num, locationPrefix);
    if (!isFinite(days) || days >= 57) return 'danger';
    if (days >= 43) return 'warning';
    if (days >= 29) return 'primary';
    return 'success';
  }

  getPriorityColorClass(num: string, locationPrefix: string): string {
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
    return `https://www.territoryhelper.com/es/Territory/${locationPrefix}-${territoryNumber}`;
  }

  closeModal(): void {
    this.modalClose.emit();
  }

  private normalizeTerritoryNumber(value: string): number {
    const match = String(value).match(/\d+/);
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
