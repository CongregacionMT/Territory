import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TerritoryRoutingModule } from './territory-routing.module';
import { TerritoryPageComponent } from './pages/territory-page/territory-page.component';
import { MariaTeresaComponent } from './pages/maria-teresa/maria-teresa.component';
import { CardTerritoryComponent } from './pages/card-territory/card-territory.component';
import { SharedModule } from '@shared/shared.module';

@NgModule({
  declarations: [
    TerritoryPageComponent,
    MariaTeresaComponent,
    CardTerritoryComponent
  ],
  imports: [
    CommonModule,
    TerritoryRoutingModule,
    SharedModule,
    ReactiveFormsModule
  ]
})
export class TerritoryModule { }
