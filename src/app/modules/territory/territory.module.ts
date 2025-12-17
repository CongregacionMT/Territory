import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { TerritoryRoutingModule } from './territory-routing.module';
import { TerritoryPageComponent } from './pages/territory-page/territory-page.component';
import { CardTerritoryComponent } from './pages/card-territory/card-territory.component';

import { MapasComponent } from './pages/mapas/mapas.component';
import { FormRuralComponent } from './components/form-rural/form-rural.component';
import { ModalFormRuralComponent } from './components/modal-form-rural/modal-form-rural.component';

@NgModule({
    imports: [
    CommonModule,
    TerritoryRoutingModule,
    ReactiveFormsModule,
    TerritoryPageComponent,
    CardTerritoryComponent,
    MapasComponent,
    FormRuralComponent,
    ModalFormRuralComponent
]
})
export class TerritoryModule { }
