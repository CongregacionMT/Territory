import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@shared/shared.module';

import { StatisticsRoutingModule } from './statistics-routing.module';
import { StatisticsPageComponent } from './pages/statistics-page/statistics-page.component';
import { TimesAssigned } from '@core/pipes/times-assigned.pipe';
import { SortBy } from "@core/pipes/sort-by.pipe";
import { DataTablesModule } from 'angular-datatables';


@NgModule({
  declarations: [
    StatisticsPageComponent,
    TimesAssigned,
    SortBy
  ],
  imports: [
    CommonModule,
    StatisticsRoutingModule,
    SharedModule,
    DataTablesModule,
  ]
})
export class StatisticsModule { }
