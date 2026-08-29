import { Routes } from '@angular/router';
import { StatisticsPageComponent } from './pages/statistics-page/statistics-page.component';
import { HomeStatisticsPageComponent } from './pages/home-statistics-page/home-statistics-page.component';

export const ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', component: HomeStatisticsPageComponent },
      { path: ':locality', component: StatisticsPageComponent, data: { breadcrumb: 'Localidad' } },
      { path: '**', redirectTo: '' },
    ],
  },
];
