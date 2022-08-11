import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AssignmentRecordRoutingModule } from './assignment-record-routing.module';
import { AssignmentRecordPageComponent } from './pages/assignment-record-page/assignment-record-page.component';
import { SharedModule } from '@shared/shared.module';
import { MariaTeresaAssignmentComponent } from './pages/maria-teresa-assignment/maria-teresa-assignment.component';
import { ChristophersenAssignmentComponent } from './pages/christophersen-assignment/christophersen-assignment.component';
import { RuralAssignmentComponent } from './pages/rural-assignment/rural-assignment.component';
import { NumberTerritoryComponent } from './pages/number-territory/number-territory.component';


@NgModule({
  declarations: [
    AssignmentRecordPageComponent,
    MariaTeresaAssignmentComponent,
    ChristophersenAssignmentComponent,
    RuralAssignmentComponent,
    NumberTerritoryComponent
  ],
  imports: [
    CommonModule,
    AssignmentRecordRoutingModule,
    SharedModule
  ]
})
export class AssignmentRecordModule { }
