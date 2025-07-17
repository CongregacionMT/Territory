import { enableProdMode, importProvidersFrom, provideEnvironmentInitializer, inject } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { initializeDialogService } from './app/app.module';
import { environment } from './environments/environment';
import { provideFirebaseApp, initializeApp, getApp } from '@angular/fire/app';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DialogService } from '@core/services/dialog.service';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { AppRoutingModule } from './app/app-routing.module';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppComponent } from './app/app.component';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserModule, AppRoutingModule, ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: environment.production,
            // Register the ServiceWorker as soon as the application is stable
            // or after 30 seconds (whichever comes first).
            registrationStrategy: 'registerWhenStable:30000'
        })),
        provideFirebaseApp(() => initializeApp(environment.firebase)),
        provideMessaging(() => getMessaging(getApp())),
        provideFirestore(() => getFirestore()),
        importProvidersFrom(MatDialogModule),
        {
            provide: provideEnvironmentInitializer(initializeDialogService),
            useFactory: initializeDialogService,
            deps: [MatDialog],
            multi: true
        },
        provideAnimations()
    ]
})
  .catch(err => console.error(err));

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./firebase-messaging-sw.js')
      .then((registration) => {
        console.log('Service Worker registrado correctamentes:', registration);
      })
      .catch((error) => {
        console.error('Error al registrar el Service Workers:', error);
      });
  }
