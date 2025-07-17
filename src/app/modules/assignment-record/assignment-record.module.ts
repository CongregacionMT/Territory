import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AssignmentRecordRoutingModule } from './assignment-record-routing.module';
import { AssignmentRecordPageComponent } from './pages/assignment-record-page/assignment-record-page.component';
import { SharedModule } from '@shared/shared.module';
import { NumberTerritoryComponent } from './pages/number-territory/number-territory.component';
import { DataTablesModule } from "angular-datatables";
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TerritoryAssignmentComponent } from './pages/territory-assignment/territory-assignment.component';
import { FormsModule } from '@angular/forms';

@NgModule({ declarations: [
        AssignmentRecordPageComponent,
        NumberTerritoryComponent,
        TerritoryAssignmentComponent
    ], imports: [CommonModule,
        AssignmentRecordRoutingModule,
        SharedModule,
        DataTablesModule,
        ReactiveFormsModule,
        FormsModule], providers: [provideHttpClient(withInterceptorsFromDi())] })
export class AssignmentRecordModule { }
