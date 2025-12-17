import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StatisticsPageComponent } from './pages/statistics-page/statistics-page.component';
import { HomeStatisticsPageComponent } from './pages/home-statistics-page/home-statistics-page.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: HomeStatisticsPageComponent},
      { path: ':locality', component: StatisticsPageComponent},
      {path: '**', redirectTo: ''},
    ],
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StatisticsRoutingModule { }
