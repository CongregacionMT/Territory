import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  templateUrl: './progress-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  percent = input.required<number>();
  sizeClass = input<string>('h-2'); // h-2, h-3, h-4, etc.
  colorClass = input<string>('bg-gradient-to-r from-emerald-500 to-emerald-400');

  // Opcional: mostrar texto interno
  showInnerPattern = input<boolean>(false);
}
