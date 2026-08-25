import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { CampaignService } from '@core/services/campaign.service';
import { MessagingService } from '@core/services/messaging.service';
import { CartDataService } from '@core/services/cart-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { AuthService } from '@core/services/auth.service';
import { PwaService } from '@core/services/pwa.service';
import { environment } from '@environments/environment';
import { TitleCasePipe } from '@angular/common';
import type { User } from '@core/models/User';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TitleCasePipe],
})
export class HomePageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private spinner = inject(SpinnerService);
  private territorieDataService = inject(TerritoryDataService);
  private campaignService = inject(CampaignService);
  private messagingService = inject(MessagingService);
  private cartDataService = inject(CartDataService);
  private _snackBar = inject(MatSnackBar);

  public authService = inject(AuthService);
  public pwaService = inject(PwaService);

  hasCartData = signal<boolean>(false);
  campaignInProgress = signal<boolean>(false);
  congregationName: string = environment.congregationName;

  ngOnInit(): void {
    this.spinner.cargarSpinner();

    this.territorieDataService
      .getNumberTerritory()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
    this.territorieDataService
      .getStatisticsButtons()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();

    if (sessionStorage.getItem('redirectedToGroup0')) {
      sessionStorage.removeItem('redirectedToGroup0');
    }

    void this.campaignService.getActiveCampaign().then((activeCampaign) => {
      if (activeCampaign) {
        localStorage.setItem('activeCampaign', JSON.stringify(activeCampaign));
        this.campaignInProgress.set(true);
      } else {
        this.campaignInProgress.set(false);
      }
      this.spinner.cerrarSpinner();
    });

    this.cartDataService
      .getCartAssignment()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cartArray) => {
          this.hasCartData.set(cartArray.cart.length > 0);
        },
      });
  }

  activeNotification(): void {
    void this.messagingService.requestPermission().then((token) => {
      const driverName = this.authService.driverName();
      if (!driverName) return;

      const userData = JSON.parse(localStorage.getItem(driverName) as string) as User;
      if (userData.tokens && !userData.tokens.includes(token)) {
        userData.tokens.push(token);
        this.territorieDataService.updateUser(userData.user, userData);
        localStorage.setItem(userData.user, JSON.stringify(userData));
        this._snackBar.open('🔔 Notificaciones activadas! 😉', 'ok');
      } else {
        this._snackBar.open('Las notificaciones ya están activadas para este dispositivo 🔔', 'ok');
      }
    });
  }
}
