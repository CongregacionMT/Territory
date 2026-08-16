import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AssignmentRecordRoutingModule } from './assignment-record-routing.module';
import { AssignmentRecordPageComponent } from './pages/assignment-record-page/assignment-record-page.component';

import { NumberTerritoryComponent } from './pages/number-territory/number-territory.component';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { TerritoryAssignmentComponent } from './pages/territory-assignment/territory-assignment.component';
import { FormsModule } from '@angular/forms';

@NgModule({
    imports: [CommonModule,
    AssignmentRecordRoutingModule,
    ReactiveFormsModule,
    FormsModule, AssignmentRecordPageComponent,
    NumberTerritoryComponent,
    TerritoryAssignmentComponent], providers: [provideHttpClient(withXhr(), withInterceptorsFromDi())] })
export class AssignmentRecordModule { }
