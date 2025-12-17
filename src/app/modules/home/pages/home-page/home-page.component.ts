import { Component, OnInit, Signal, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { CampaignService } from '@core/services/campaign.service';
import { MessagingService } from '@core/services/messaging.service';
import { CartDataService } from '@core/services/cart-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { UpdateSnackbarComponent } from '@shared/components/update-snackbar/update-snackbar.component';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { StatisticsButton } from '@core/models/StatisticsButton';
import { filter } from 'rxjs';
import { environment } from '@environments/environment';

@Component({
    selector: 'app-home-page',
    templateUrl: './home-page.component.html',
    styleUrls: ['./home-page.component.scss'],
    imports: [RouterLink]
})
export class HomePageComponent implements OnInit {
  private router = inject(Router);
  private swUpdate = inject(SwUpdate);
  private spinner = inject(SpinnerService);
  private territorieDataService = inject(TerritoryDataService);
  private campaignService = inject(CampaignService);
  private messagingService = inject(MessagingService);
  private cartDataService = inject(CartDataService);
  private _snackBar = inject(MatSnackBar);

  isAdmin: boolean = false;
  isDriver: boolean = false;
  hasCartData: boolean = false;
  btnLogin: boolean = false;
  btnPWA: boolean = false;
  isIos: boolean = false;
  campaignInProgress = signal(false);
  deferredPrompt: any;
  nameDriver: string = '';
  congregationName: string = environment.congregationName;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    if(this.deferredPrompt){
      this.btnPWA = false;
    }
    this.nameDriver = localStorage.getItem('nombreConductor') as string;
  }

  async ngOnInit() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          const snack = this._snackBar.openFromComponent(UpdateSnackbarComponent, {
            duration: undefined,
            horizontalPosition: 'center',
            verticalPosition: 'top',
          });
          snack.onAction().subscribe(() => {
            this.swUpdate.activateUpdate().then(() => window.location.reload());
          });
        });

      this.swUpdate.checkForUpdate(); // opcional
    }

    if(localStorage.getItem("tokenAdmin")){
      this.isAdmin = true;
    } else if(localStorage.getItem("tokenConductor")){
      this.isDriver = true;
    }

    if(!sessionStorage.getItem("numberTerritory")){
      this.spinner.cargarSpinner();
      this.territorieDataService.getNumberTerritory()
      .subscribe((numbers: TerritoryNumberData[]) => {
        // Merge all documents into a single object
        const mergedData = numbers.reduce((acc: any, curr: any) => {
          return { ...acc, ...curr };
        }, {});
        sessionStorage.setItem("numberTerritory", JSON.stringify(mergedData));
      });
    }

    if(!sessionStorage.getItem("territorioStatistics")){
      this.spinner.cargarSpinner();
      this.territorieDataService.getStatisticsButtons()
      .subscribe((number: StatisticsButton[]) => {
        if (number.length > 0) {
            sessionStorage.setItem("territorioStatistics", JSON.stringify(number[0]));
        }
      });
    }

    if(sessionStorage.getItem("redirectedToGroup0")){
      sessionStorage.removeItem("redirectedToGroup0");
    }

    // Mostrar boton de loguearse

    this.isAdmin === true && this.isDriver === false ? this.btnLogin = false :this.btnLogin = true;

    this.isAdmin === false && this.isDriver === true ? this.btnLogin = false :this.btnLogin = true;

    this.isAdmin === false && this.isDriver === false ? this.btnLogin = true: this.btnLogin = false

    this.spinner.cargarSpinner();
    const activeCampaign = await this.campaignService.getActiveCampaign();
    this.spinner.cerrarSpinner();
    if (activeCampaign) {
      localStorage.setItem('activeCampaign', JSON.stringify(activeCampaign));
      this.campaignInProgress.set(true);
    } else {
      this.campaignInProgress.set(false);
    }

    // Init PWA
    this.initPWA();

    this.cartDataService.getCartAssignment().subscribe({
      next: (cartArray) => {
        if (cartArray.cart.length > 0) {
          this.hasCartData = true;
        }
      }
    });

    this.spinner.cerrarSpinner();
  }

  logout(){
    localStorage.clear();
    this.router.navigate(['auth'])
  }

  // PWA

  initPWA() {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    this.isIos = /iphone|ipad|ipod/.test(userAgent);

    // Check if standalone (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         ((window.navigator as any).standalone === true);

    if (isStandalone) {
      this.btnPWA = false;
    } else {
      // If not installed...
      if (this.isIos) {
        // On iOS, we can always show the button because there's no beforeinstallprompt to wait for.
        // But we check strictly if it's NOT standalone.
        this.btnPWA = true;
      }
      // For Android/Desktop, we wait for the event, so btnPWA remains false until the event fires.
    }

    window.addEventListener('appinstalled', (e) => {
      this.btnPWA = false;
      this.deferredPrompt = null;
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.btnPWA = true;
    });
  }

  installPWA() {
    if (this.isIos) {
      this._snackBar.open('Para instalar en iOS: Presiona "Compartir" y de las opciones elige "Agregar a Inicio" 📲', 'Ok', {
        duration: 8000,
        verticalPosition: 'bottom',
        horizontalPosition: 'center'
      });
      return;
    }

    if (!this.deferredPrompt) {
      return;
    }

    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        this.btnPWA = false;
      }
      this.deferredPrompt = null;
    });
  }
  capitalizeFirstLetter(text: string): string {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  activeNotification(){
    this.messagingService.requestPermission().then((token) => {
      let userData = JSON.parse(localStorage.getItem(this.nameDriver) as string);
      if(!userData.tokens.includes(token)){
        userData.tokens.push(token)
        this.territorieDataService.updateUser(userData.user, userData);
        localStorage.setItem(userData.user, JSON.stringify(userData));
        this._snackBar.open('🔔 Notificaciones activadas! 😉', 'ok');
      } else {
        this._snackBar.open('Las notificaciones ya están activadas para este dispositivo 🔔', 'ok');
      }
    });
  }
}
