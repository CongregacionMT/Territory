import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CardTerritoryComponent } from './pages/card-territory/card-territory.component';
import { MapasComponent } from './pages/mapas/mapas.component';
import { TerritoryPageComponent } from './pages/territory-page/territory-page.component';


export const ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', component: TerritoryPageComponent},

      { path: 'wheelwright', component: MapasComponent, data: { breadcrumb: 'Wheelwright' } },
      { path: 'mariaTeresa', component: MapasComponent, data: { breadcrumb: 'Maria Teresa' } },
      { path: 'christophersen', component: MapasComponent, data: { breadcrumb: 'Christophersen' } },
      { path: 'hughes', component: MapasComponent, data: { breadcrumb: 'Hughes' } },
      { path: 'labordeboy', component: MapasComponent, data: { breadcrumb: 'Labordeboy' } },
      { path: 'villa-estela', component: MapasComponent, data: { breadcrumb: 'Villa Estela' } },
      { path: 'arias', component: MapasComponent, data: { breadcrumb: 'Arias' } },
      { path: 'rural', component: MapasComponent, data: { breadcrumb: 'Rural' } },

      // Otras rutas generales
      { path: 'ubications-overseer', component: MapasComponent, data: { breadcrumb: 'Ubicaciones' } },

      // Redirect legacy (mantener por compatibilidad temporal)
      { path: 'TerritorioW-Rural', redirectTo: 'rural'},

      // Ruta dinámica para territorios (DEBE IR AL FINAL)
      { path: ':collection', component: CardTerritoryComponent, data: { breadcrumb: 'Tarjeta' } },

      {path: '**', redirectTo: ''},
    ],
  }
];


