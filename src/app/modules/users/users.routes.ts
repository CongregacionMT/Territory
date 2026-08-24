import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UsersPageComponent } from './users-page/users-page.component';

export const ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', component: UsersPageComponent },
      { path: '**', redirectTo: '' },
    ],
  },
];
