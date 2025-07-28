import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./modules/home/home.module').then(m => m.HomeModule)
  },
  {
    path: 'territorios',
    loadChildren: () => import('./modules/territory/territory.module').then(m => m.TerritoryModule)
  },
  {
    path: 'carrito',
    loadChildren: () => import('./modules/cart/cart.module').then(m => m.CartModule)
  },
  {
    path: 'salidas',
    loadChildren: () => import('./modules/departures/departures.module').then(m => m.DeparturesModule)
  },
  {
    path: 'registro-territorios',
    loadChildren: () => import('./modules/assignment-record/assignment-record.module').then(m => m.AssignmentRecordModule)
  },
  {
    path: 'statistics',
    loadChildren: () => import('./modules/statistics/statistics.module').then(m => m.StatisticsModule), data: { scrollPositionRestoration: 'top' }
  },
  {
    path: 'campaign',
    loadChildren: () => import('./modules/campaign/campaign.module').then(m => m.CampaignModule), data: { scrollPositionRestoration: 'top' }
  },
  {
    path: 'usuarios',
    loadChildren: () => import('./modules/users/users.module').then(m => m.UsersModule)
  },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: '**', redirectTo: 'home'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })
],
  exports: [RouterModule]
})
export class AppRoutingModule { }
