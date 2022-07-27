import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TerritoryRoutingModule } from './territory-routing.module';
import { TerritoryPageComponent } from './pages/territory-page/territory-page.component';
import { CardXlComponent } from '@shared/components/card-xl/card-xl.component';
import { CardSComponent } from '@shared/components/card-s/card-s.component';


@NgModule({
  declarations: [
    TerritoryPageComponent,
    CardSComponent,
    CardXlComponent
  ],
  imports: [
    CommonModule,
    TerritoryRoutingModule
  ]
})
export class TerritoryModule { }
