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

      { path: 'wheelwright', component: MapasComponent},
      { path: 'mariaTeresa', component: MapasComponent},
      { path: 'christophersen', component: MapasComponent},
      { path: 'hughes', component: MapasComponent},
      { path: 'labordeboy', component: MapasComponent},
      { path: 'villa-estela', component: MapasComponent},
      { path: 'rural', component: MapasComponent},

      // Otras rutas generales
      { path: 'ubications-overseer', component: MapasComponent},

      // Redirect legacy (mantener por compatibilidad temporal)
      { path: 'TerritorioW-Rural', redirectTo: 'rural'},

      // Ruta dinámica para territorios (DEBE IR AL FINAL)
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
