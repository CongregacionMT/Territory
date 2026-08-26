
import { Component, input, output, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormArray, FormControl } from '@angular/forms';

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
  personalAssignments = input.required<any[]>();
  localities = input.required<any[]>();

  // Outputs
  close = output<void>();

  // State
  sortByAge = true;
  showPersonalTerritories = true;
  selectedTerritoryGroup: number | null = null;

  locationPrefix = computed(() => {
    return this.activeModalDays().get('location')?.value || '';
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
    const assignment = this.personalAssignments().find(
      (a) => a.locationPrefix === locationPrefix && a.territorio === Number(num),
    );
    return !!assignment && assignment.isPersonal;
  }

  isTerritoryChecked(num: string): boolean {
    const territoryArray = this.activeModalDays().get('territory') as FormArray;
    if (!territoryArray) return false;
    return territoryArray.value.includes(num);
  }

  handleCheckboxChange(event: Event, num: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    const territoryArray = this.activeModalDays().get('territory') as FormArray;
    if (!territoryArray) return;

    if (checked) {
      if (!territoryArray.value.includes(num)) {
        territoryArray.push(new FormControl(num));
      }
    } else {
      const index = territoryArray.value.findIndex((val: string) => val === num);
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
        const formArray = this.formDeparture().get(key) as FormArray;

        formArray.controls.forEach((groupControl, i) => {
          if (groupIndex === this.groupKey() && i === this.dayIndex()) return;

          if (groupControl.get('location')?.value === locPrefix) {
            const territoryVals = groupControl.get('territory')?.value || [];
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
    this.close.emit();
  }
}
