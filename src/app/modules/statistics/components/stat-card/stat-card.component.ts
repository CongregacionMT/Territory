import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow hover:-translate-y-1 duration-200 h-full"
    >
      <div class="flex items-center mb-4">
        <div
          [class]="
            'w-12 h-12 rounded-xl flex items-center justify-center mr-4 ' +
            iconBgColorClass() +
            ' ' +
            iconColorClass()
          "
        >
          <i [class]="'text-xl ' + icon()"></i>
        </div>
        <span class="text-slate-400 text-xs font-bold uppercase tracking-wider">{{ title() }}</span>
      </div>
      <h3 class="text-3xl font-black text-white mb-1">
        @if (isPercentage()) {
          {{ value() }}%
        } @else {
          {{ value() }}
        }
      </h3>
      <p class="text-slate-500 text-sm mb-0">{{ subtitle() }}</p>
    </div>
  `,
})
export class StatCardComponent {
  title = input.required<string>();
  value = input.required<number | string>();
  subtitle = input.required<string>();
  icon = input.required<string>();
  iconBgColorClass = input.required<string>();
  iconColorClass = input.required<string>();
  isPercentage = input<boolean>(false);
}
