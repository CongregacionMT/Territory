import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TerritoryPageComponent } from './pages/territory-page/territory-page.component';

const routes: Routes = [
  {
    path: '',
    component: TerritoryPageComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TerritoryRoutingModule { }
