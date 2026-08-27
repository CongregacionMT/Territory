import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@core/services/auth.service';
import { CampaignService } from '@core/services/campaign.service';
import { CartDataService } from '@core/services/cart-data.service';
import { MessagingService } from '@core/services/messaging.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { User } from '@core/models/User';
import { take } from 'rxjs';

@Injectable({
  providedIn: 'root', // Lo proveemos en root para que esté disponible, o podría ser 'any' / provided en el módulo
})
export class HomeFacadeService {
  private readonly spinner = inject(SpinnerService);
  private territorieDataService = inject(TerritoryDataService);
  private campaignService = inject(CampaignService);
  private messagingService = inject(MessagingService);
  private cartDataService = inject(CartDataService);
  private _snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  initializeHomeState(): void {
    // 🚀 Hacemos pre-fetching de datos en background SIN bloquear la pantalla con el spinner
    this.territorieDataService.getNumberTerritory().pipe(take(1)).subscribe();
    this.territorieDataService.getStatisticsButtons().pipe(take(1)).subscribe();
    this.cartDataService.getCartAssignment().pipe(take(1)).subscribe();

    if (sessionStorage.getItem('redirectedToGroup0')) {
      sessionStorage.removeItem('redirectedToGroup0');
    }

    // Buscamos la campaña activa en silencio
    this.campaignService
      .getActiveCampaign()
      .then((activeCampaign) => {
        if (activeCampaign) {
          localStorage.setItem('activeCampaign', JSON.stringify(activeCampaign));
        } else {
          localStorage.removeItem('activeCampaign');
        }
      })
      .catch((error) => {
        console.error('[HomeFacade] Error pre-cargando campaña:', error);
      });
  }

  enableNotifications(): void {
    void this.messagingService.requestPermission().then((token) => {
      const driverName = this.authService.driverName();
      if (!driverName) return;

      const userDataStr = localStorage.getItem(driverName);
      if (userDataStr) {
        const userData = JSON.parse(userDataStr) as User;

        if (!userData.tokens) {
          userData.tokens = [];
        }

        if (!userData.tokens.includes(token)) {
          userData.tokens.push(token);
          this.territorieDataService.updateUser(userData.user, userData);
          localStorage.setItem(userData.user, JSON.stringify(userData));
          this._snackBar.open('🔔 Notificaciones activadas! 😉', 'ok');
        } else {
          this._snackBar.open(
            'Las notificaciones ya están activadas para este dispositivo 🔔',
            'ok',
          );
        }
      }
    });
  }
}
