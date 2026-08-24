import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./modules/home/home.routes').then((m) => m.ROUTES),
    data: { breadcrumb: 'Home' },
  },
  {
    path: 'territorios',
    loadChildren: () => import('./modules/territory/territory.routes').then((m) => m.ROUTES),
    data: { breadcrumb: 'Territorios' },
  },
  {
    path: 'carrito',
    loadChildren: () => import('./modules/cart/cart.routes').then((m) => m.ROUTES),
    data: { breadcrumb: 'Carrito' },
  },
  {
    path: 'salidas',
    loadChildren: () => import('./modules/departures/departures.routes').then((m) => m.ROUTES),
    data: { breadcrumb: 'Salidas' },
  },
  {
    path: 'registro-territorios',
    loadChildren: () =>
      import('./modules/assignment-record/assignment-record.routes').then((m) => m.ROUTES),
    data: { breadcrumb: 'Registro' },
  },
  {
    path: 'statistics',
    loadChildren: () => import('./modules/statistics/statistics.routes').then((m) => m.ROUTES),
    data: { scrollPositionRestoration: 'top', breadcrumb: 'Estadísticas' },
  },
  {
    path: 'campaign',
    loadChildren: () => import('./modules/campaign/campaign.routes').then((m) => m.ROUTES),
    data: { scrollPositionRestoration: 'top', breadcrumb: 'Campaña' },
  },
  {
    path: 'circuit-overseer',
    loadChildren: () =>
      import('./modules/circuit-overseer/circuit-overseer.routes').then((m) => m.ROUTES),
    data: { scrollPositionRestoration: 'top', breadcrumb: 'Visita' },
  },
  {
    path: 'usuarios',
    loadChildren: () => import('./modules/users/users.routes').then((m) => m.ROUTES),
    data: { breadcrumb: 'Usuarios' },
  },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.routes').then((m) => m.ROUTES),
    data: { breadcrumb: 'Autenticación' },
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
