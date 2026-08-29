import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';

export const ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', component: HomePageComponent },
      { path: '**', redirectTo: '' },
    ],
  },
];
