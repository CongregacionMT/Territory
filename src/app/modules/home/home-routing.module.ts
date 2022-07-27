import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DeparturePageComponent } from './pages/departure-page/departure-page.component';
import { HomePageComponent } from './pages/home-page/home-page.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: HomePageComponent },
      { path: 'salidas', component: DeparturePageComponent},
      {path: '**', redirectTo: ''},
    ],
  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }
