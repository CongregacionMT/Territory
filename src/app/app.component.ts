import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy , DestroyRef} from '@angular/core';
import { MessagingService } from '@core/services/messaging.service';
import { SpinnerService } from '@core/services/spinner.service';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [RouterOutlet]
})
export class AppComponent implements OnInit{
  private destroyRef = inject(DestroyRef);
  private spinner = inject(SpinnerService);
  private messagingService = inject(MessagingService);

  isLoading$ = this.spinner.isLoading;

  constructor() {}

  ngOnInit(): void{
  }
}
