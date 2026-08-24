import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page/login-page.component';

export const ROUTES: Routes = [
  {
    path: '',
    component: LoginPageComponent,
  },
];
