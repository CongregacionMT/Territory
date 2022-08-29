import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CardTerritoryComponent } from './pages/card-territory/card-territory.component';
import { MapasComponent } from './pages/mapas/mapas.component';
import { TerritoryPageComponent } from './pages/territory-page/territory-page.component';


const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: TerritoryPageComponent},
      { path: 'maria-teresa', component: MapasComponent},
      { path: 'christophersen', component: MapasComponent},
      { path: ':collection', component: CardTerritoryComponent},
      { path: ':collection', component: CardTerritoryComponent},
      {path: '**', redirectTo: ''},
    ],
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TerritoryRoutingModule { }
