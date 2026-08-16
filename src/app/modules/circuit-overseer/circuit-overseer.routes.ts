import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

export const ROUTES: Routes = [
  {
    path: '', component: HomeComponent
  }
];


