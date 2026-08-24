import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CartPageComponent } from './pages/cart-page/cart-page.component';
import { CartEditPageComponent } from './pages/cart-edit-page/cart-edit-page.component';

export const ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', component: CartPageComponent },
      { path: 'editar', component: CartEditPageComponent, data: { breadcrumb: 'Editar' } },
    ],
  },
];
