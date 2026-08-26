import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-legend-item',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="'border rounded-xl p-5 border-l-4 ' + bgClass() + ' ' + borderClass()">
      <div [class]="'font-bold mb-3 ' + textClass()">{{ title() }}</div>
      <div class="flex items-center mb-3">
        <input
          [formControl]="control()"
          class="w-20 bg-slate-950 border border-slate-700 text-slate-200 rounded-l-md px-3 py-1.5 text-center text-sm focus:outline-none focus:border-sky-500"
          type="number"
          [attr.aria-label]="ariaLabel()"
        />
        <span
          class="bg-slate-800 border border-slate-700 border-l-0 text-slate-400 px-3 py-1.5 text-sm rounded-r-md"
          >días</span
        >
      </div>
      <div class="text-xs text-slate-500">{{ description() }}</div>
    </div>
  `,
})
export class LegendItemComponent {
  title = input.required<string>();
  description = input.required<string>();
  control = input.required<FormControl>();
  ariaLabel = input.required<string>();

  bgClass = input.required<string>();
  borderClass = input.required<string>();
  textClass = input.required<string>();
}
