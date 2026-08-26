import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MessagingService } from '@core/services/messaging.service';
import { SpinnerService } from '@core/services/spinner.service';
import { RouterOutlet } from '@angular/router';
import { BreadcrumbComponent } from './shared/components/breadcrumb/breadcrumb.component';
import { BreadcrumbService } from '@core/services/breadcrumb.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, BreadcrumbComponent],
})
export class AppComponent {
  private spinner = inject(SpinnerService);
  private messagingService = inject(MessagingService);
  private breadcrumbService = inject(BreadcrumbService);

  isLoading$ = this.spinner.isLoading;
  showBreadcrumb = this.breadcrumbService.showBreadcrumb;
}
