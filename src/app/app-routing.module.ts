import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AssignmentRecordPageComponent } from '@modules/assignment-record/pages/assignment-record-page/assignment-record-page.component';
import { DeparturePageComponent } from '@modules/home/pages/departure-page/departure-page.component';
// components
import { HomePageComponent } from '@modules/home/pages/home-page/home-page.component';
import { TerritoryPageComponent } from '@modules/home/pages/territory-page/territory-page.component';

const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    loadChildren: () => import('./modules/home/home.module').then(m => m.HomeModule)
  },
  {
    path: 'territorios',
    component: TerritoryPageComponent,
    loadChildren: () => import('./modules/home/home.module').then(m => m.HomeModule)
  },
  {
    path: 'salidas',
    component: DeparturePageComponent,
    loadChildren: () => import('./modules/home/home.module').then(m => m.HomeModule)
  },
  {
    path: 'registro-territorios',
    component: AssignmentRecordPageComponent,
    loadChildren: () => import('./modules/assignment-record/assignment-record.module').then(m => m.AssignmentRecordModule)
  },
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
