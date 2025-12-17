import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DeparturesRoutingModule } from './departures-routing.module';
import { HomeDeparturePageComponent } from './pages/home-departure-page/home-departure-page.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DeparturePageComponent } from './pages/departure-page/departure-page.component';
import { TablePublishersPageComponent } from './pages/table-publishers-page/table-publishers-page.component';
import { EditDeparturesComponent } from './pages/edit-departures/edit-departures.component';
import { FormEditDeparturesComponent } from './components/form-edit-departures/form-edit-departures.component';


@NgModule({
    imports: [
    CommonModule,
    DeparturesRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    HomeDeparturePageComponent,
    DeparturePageComponent,
    TablePublishersPageComponent,
    EditDeparturesComponent,
    FormEditDeparturesComponent
]
})
export class DeparturesModule { }
