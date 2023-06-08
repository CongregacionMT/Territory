import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { MessagingService } from '@core/services/messaging.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit {

  isAdmin: boolean = false;
  isDriver: boolean = false;
  btnLogin: boolean = false;
  btnPWA: boolean = true;
  deferredPrompt: any;
  constructor(private router: Router, private swUpdate: SwUpdate, private spinner: SpinnerService, private territorieDataService: TerritoryDataService, private messagingService:MessagingService, private _snackBar: MatSnackBar,) {
    if(this.swUpdate.available){
      this.swUpdate.available.subscribe(() => {
        if(confirm('Existe una nueva versión de la aplicación. ¿Deseas instalarla?')){
          window.location.reload();
        }
      })
    }
    if(this.deferredPrompt){
      this.btnPWA = false;
    }
  }

  ngOnInit(): void {
    if(localStorage.getItem("tokenAdmin")){
      this.isAdmin = true;
    } else if(localStorage.getItem("tokenConductor")){
      this.isDriver = true;
    }

    if(!sessionStorage.getItem("numberTerritory")){
      this.spinner.cargarSpinner();
      this.territorieDataService.getNumberTerritory()
      .subscribe(number => {
        sessionStorage.setItem("numberTerritory", JSON.stringify(number[0]));
        this.spinner.cerrarSpinner();
      });
    }

    // Mostrar boton de loguearse

    this.isAdmin === true && this.isDriver === false ? this.btnLogin = false :this.btnLogin = true;

    this.isAdmin === false && this.isDriver === true ? this.btnLogin = false :this.btnLogin = true;

    this.isAdmin === false && this.isDriver === false ? this.btnLogin = true: this.btnLogin = false

    // Init PWA
    this.initPWA();
  }

  logout(){
    localStorage.clear();
    this.router.navigate(['auth'])
  }

  // PWA

  initPWA(){

    // For Android
    if(window.matchMedia('(display-mode: standalone)').matches){
      console.log("app instalada");
      this.btnPWA = false;
    }
    window.addEventListener('appinstalled', (e) => {
      console.log("La app está instalada", e);
      this.btnPWA = false;
    });
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log("evento de instalación");
    });
  }

  installPWA(){
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoise.then((choiceResult: any) => {
      if(choiceResult.outcome === 'accepted'){
        console.log("User accepted to install app");
        this.btnPWA = false;
      } else {
        console.log("User canceled to install app");
        this.btnPWA = true;
      }
      this.deferredPrompt = null;
    });
  }
  activeNotification(){
    this.messagingService.requestPermission().then((token) => {
      let nombreConductor = localStorage.getItem('nombreConductor') as string;
      let userData = JSON.parse(localStorage.getItem(nombreConductor) as string);
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
