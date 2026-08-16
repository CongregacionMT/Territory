import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./modules/home/home.routes').then(m => m.ROUTES)
  },
  {
    path: 'territorios',
    loadChildren: () => import('./modules/territory/territory.routes').then(m => m.ROUTES)
  },
  {
    path: 'carrito',
    loadChildren: () => import('./modules/cart/cart.routes').then(m => m.ROUTES)
  },
  {
    path: 'salidas',
    loadChildren: () => import('./modules/departures/departures.routes').then(m => m.ROUTES)
  },
  {
    path: 'registro-territorios',
    loadChildren: () => import('./modules/assignment-record/assignment-record.routes').then(m => m.ROUTES)
  },
  {
    path: 'statistics',
    loadChildren: () => import('./modules/statistics/statistics.routes').then(m => m.ROUTES), data: { scrollPositionRestoration: 'top' }
  },
  {
    path: 'campaign',
    loadChildren: () => import('./modules/campaign/campaign.routes').then(m => m.ROUTES), data: { scrollPositionRestoration: 'top' }
  },
  {
    path: 'circuit-overseer',
    loadChildren: () => import('./modules/circuit-overseer/circuit-overseer.routes').then(m => m.ROUTES), data: { scrollPositionRestoration: 'top' }
  },
  {
    path: 'usuarios',
    loadChildren: () => import('./modules/users/users.routes').then(m => m.ROUTES)
  },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.routes').then(m => m.ROUTES)
  },
  {
    path: '**', redirectTo: 'home'
  }
];
