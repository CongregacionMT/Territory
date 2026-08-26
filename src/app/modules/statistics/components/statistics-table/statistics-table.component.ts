import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { Card } from '@core/models/Card';
import { DatePipe, NgClass } from '@angular/common';
import { SortBy } from '@core/pipes/sort-by.pipe';

@Component({
  selector: 'app-statistics-table',
  standalone: true,
  imports: [DatePipe, SortBy, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm mb-8 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr class="bg-slate-950/50 border-b border-slate-800">
              <th class="pl-6 py-4 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <button
                  type="button"
                  (click)="onSort('numberTerritory')"
                  class="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded p-1"
                  aria-label="Ordenar tabla por número de territorio"
                >
                  Territorio
                  <i
                    [class]="getIcon('numberTerritory')"
                    class="text-sky-500"
                    aria-hidden="true"
                  ></i>
                </button>
              </th>
              <th class="py-4 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <button
                  type="button"
                  (click)="onSort('applesData')"
                  class="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded p-1"
                  aria-label="Ordenar tabla por manzanas"
                >
                  Manzanas
                  <i [class]="getIcon('applesData')" class="text-sky-500" aria-hidden="true"></i>
                </button>
              </th>
              <th
                class="pr-6 py-4 text-slate-400 text-xs font-bold uppercase tracking-wider text-right"
              >
                <button
                  type="button"
                  (click)="onSort('end')"
                  class="flex items-center justify-end gap-2 ml-auto focus:outline-none focus:ring-2 focus:ring-sky-500 rounded p-1"
                  aria-label="Ordenar tabla por fecha de última vez completado"
                >
                  Última vez completado
                  <i [class]="getIcon('end')" class="text-sky-500" aria-hidden="true"></i>
                </button>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/50">
            @for (dataList of data() | sortBy: path() : order(); track dataList) {
              <tr
                class="transition-colors hover:bg-slate-800/30"
                [ngClass]="{
                  'bg-emerald-900/10 border-l-4 border-l-emerald-500':
                    paintRow(dataList) === 'success',
                  'bg-sky-900/10 border-l-4 border-l-sky-500': paintRow(dataList) === 'primary',
                  'bg-amber-900/10 border-l-4 border-l-amber-500': paintRow(dataList) === 'warning',
                  'bg-rose-900/10 border-l-4 border-l-rose-500': paintRow(dataList) === 'danger',
                }"
              >
                <td class="pl-6 py-4">
                  <div class="flex items-center gap-3 flex-wrap">
                    <span class="font-semibold text-slate-200">
                      Número {{ dataList[0].numberTerritory }}
                    </span>
                    @if (isPersonalTerritory(dataList[0].numberTerritory)) {
                      <span
                        class="px-2.5 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-bold rounded-md flex items-center gap-1"
                        [title]="
                          'Publicador: ' +
                          (getPersonalEntry(dataList[0].numberTerritory)?.publisher || '')
                        "
                      >
                        <i class="fas fa-home"></i> Territorio Personal
                      </span>
                    }
                  </div>
                </td>
                <td class="py-4">
                  @if (dataList[0].applesData && dataList[0].applesData.length > 0) {
                    <span
                      class="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium rounded-full"
                    >
                      {{ dataList[0].applesData.length }} manzanas
                    </span>
                  } @else {
                    <span class="text-slate-500 text-xs italic">Sin actividad</span>
                  }
                </td>
                <td class="pr-6 py-4 text-right">
                  <div class="flex flex-col items-end">
                    <span class="font-medium text-slate-200">
                      @let lastEnd = getLastEnd(dataList);
                      @if (lastEnd) {
                        {{ lastEnd | date: 'dd/MM/yyyy' }}
                      } @else {
                        <span
                          class="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-full"
                          >NUNCA</span
                        >
                      }
                    </span>
                    <span class="text-slate-500 text-xs mt-1">
                      {{
                        dataList[0].driver && dataList[0].driver !== 'Nadie'
                          ? 'Por ' + dataList[0].driver
                          : 'Sin asignar'
                      }}
                    </span>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3" class="text-center py-12">
                  <div
                    class="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <i class="fas fa-folder-open text-2xl text-slate-500"></i>
                  </div>
                  <p class="text-slate-400 font-medium">
                    No hay actividad registrada en este periodo
                  </p>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class StatisticsTableComponent {
  data = input.required<Card[][]>();
  path = input.required<string>();
  order = input.required<number>();
  personalTerritories = input.required<Card[]>();

  // Legend thresholds
  greenThreshold = input.required<number>();
  blueThreshold = input.required<number>();
  yellowThreshold = input.required<number>();

  sortChanged = output<string>();

  onSort(prop: string) {
    this.sortChanged.emit(prop);
  }

  getIcon(prop: string): string {
    if (this.path() !== prop) return 'fa fa-sort opacity-50';
    return this.order() === -1 ? 'fa fa-sort-down text-primary' : 'fa fa-sort-up text-primary';
  }

  getLastEnd(dataList: Card[]): string | Date | undefined {
    return (
      dataList[0]?.end ||
      dataList[1]?.end ||
      dataList[2]?.end ||
      dataList[3]?.end ||
      dataList[4]?.end ||
      dataList[5]?.end
    );
  }

  paintRow(dataList: Card[]): string {
    const today = new Date();
    const dateToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const lastEnd = this.getLastEnd(dataList);

    if (!lastEnd) return 'danger';

    const dateCard = new Date(lastEnd);
    const difference = Math.abs(dateCard.getTime() - dateToday.getTime());
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));

    if (days < this.greenThreshold()) return 'success';
    if (days < this.blueThreshold()) return 'primary';
    if (days < this.yellowThreshold()) return 'warning';
    return 'danger';
  }

  isPersonalTerritory(number: string | number | undefined): boolean {
    if (number === undefined) return false;
    const searchNum = parseInt(String(number), 10);
    return this.personalTerritories().some(
      (e: Card) => parseInt(String(e.territory), 10) === searchNum,
    );
  }

  getPersonalEntry(number: string | number | undefined): Card | undefined {
    if (number === undefined) return undefined;
    const searchNum = parseInt(String(number), 10);
    return this.personalTerritories().find(
      (e: Card) => parseInt(String(e.territory), 10) === searchNum,
    );
  }
}
