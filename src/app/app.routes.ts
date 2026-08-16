import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./modules/home/home.routes').then(m => m.HOME_ROUTES)
  },
  {
    path: 'territorios',
    loadChildren: () => import('./modules/territory/territory.routes').then(m => m.TERRITORY_ROUTES)
  },
  {
    path: 'carrito',
    loadChildren: () => import('./modules/cart/cart.routes').then(m => m.CART_ROUTES)
  },
  {
    path: 'salidas',
    loadChildren: () => import('./modules/departures/departures.routes').then(m => m.DEPARTURES_ROUTES)
  },
  {
    path: 'registro-territorios',
    loadChildren: () => import('./modules/assignment-record/assignment-record.routes').then(m => m.ASSIGNMENT_RECORD_ROUTES)
  },
  {
    path: 'statistics',
    loadChildren: () => import('./modules/statistics/statistics.routes').then(m => m.STATISTICS_ROUTES), data: { scrollPositionRestoration: 'top' }
  },
  {
    path: 'campaign',
    loadChildren: () => import('./modules/campaign/campaign.routes').then(m => m.CAMPAIGN_ROUTES), data: { scrollPositionRestoration: 'top' }
  },
  {
    path: 'circuit-overseer',
    loadChildren: () => import('./modules/circuit-overseer/circuit-overseer.routes').then(m => m.CIRCUIT_OVERSEER_ROUTES), data: { scrollPositionRestoration: 'top' }
  },
  {
    path: 'usuarios',
    loadChildren: () => import('./modules/users/users.routes').then(m => m.USERS_ROUTES)
  },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: '**', redirectTo: 'home'
  }
];
