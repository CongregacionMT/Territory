import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AssignmentRecordRoutingModule } from './assignment-record-routing.module';
import { AssignmentRecordPageComponent } from './pages/assignment-record-page/assignment-record-page.component';
import { SharedModule } from '@shared/shared.module';


@NgModule({
  declarations: [
    AssignmentRecordPageComponent
  ],
  imports: [
    CommonModule,
    AssignmentRecordRoutingModule,
    SharedModule
  ]
})
export class AssignmentRecordModule { }
