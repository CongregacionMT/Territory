import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  templateUrl: './kpi-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardComponent {
  title = input.required<string>();
  value = input.required<string | number>();
  total = input<string | number>();
  icon = input<string>(); // SVG path or generic icon name
  colorClass = input<string>('text-sky-500');
  bgClass = input<string>('bg-sky-500/10');
}
