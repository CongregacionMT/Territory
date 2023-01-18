import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DeparturesRoutingModule } from './departures-routing.module';
import { DeparturePageComponent } from './pages/departure-page/departure-page.component';
import { SharedModule } from '@shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { GroupPageComponent } from './pages/group-page/group-page.component';
import { TablePublishersPageComponent } from './pages/table-publishers-page/table-publishers-page.component';


@NgModule({
  declarations: [
    DeparturePageComponent,
    GroupPageComponent,
    TablePublishersPageComponent
  ],
  imports: [
    CommonModule,
    DeparturesRoutingModule,
    SharedModule,
    ReactiveFormsModule
  ]
})
export class DeparturesModule { }
