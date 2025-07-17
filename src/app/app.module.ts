import { ENVIRONMENT_INITIALIZER, NgModule, importProvidersFrom, inject, provideEnvironmentInitializer } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { initializeApp,provideFirebaseApp, getApp } from '@angular/fire/app';
import { getMessaging, provideMessaging } from '@angular/fire/messaging';
import { environment } from '../environments/environment';
import { provideFirestore,getFirestore } from '@angular/fire/firestore';
import { ServiceWorkerModule } from '@angular/service-worker';
import { DialogService } from '@core/services/dialog.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

export function initializeDialogService() {
  return () => {
    inject(DialogService)
  };
}


