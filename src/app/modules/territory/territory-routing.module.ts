import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CardTerritoryComponent } from './pages/card-territory/card-territory.component';
import { MariaTeresaComponent } from './pages/maria-teresa/maria-teresa.component';
import { TerritoryPageComponent } from './pages/territory-page/territory-page.component';


const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: TerritoryPageComponent},
      { path: 'maria-teresa', component: MariaTeresaComponent},
      { path: 'tarjeta-mt', component: CardTerritoryComponent},
      { path: 'tarjeta-c', component: CardTerritoryComponent},
      {path: '**', redirectTo: ''},
    ],
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TerritoryRoutingModule { }
