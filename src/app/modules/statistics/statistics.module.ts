import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';


import { StatisticsRoutingModule } from './statistics-routing.module';
import { StatisticsPageComponent } from './pages/statistics-page/statistics-page.component';
import { TimesAssigned } from '@core/pipes/times-assigned.pipe';
import { SortBy } from "@core/pipes/sort-by.pipe";
import { DataTablesModule } from 'angular-datatables';
import { HomeStatisticsPageComponent } from './pages/home-statistics-page/home-statistics-page.component';
import { ReactiveFormsModule } from '@angular/forms';


@NgModule({
    imports: [
    CommonModule,
    StatisticsRoutingModule,
    DataTablesModule,
    ReactiveFormsModule,
    StatisticsPageComponent,
    TimesAssigned,
    SortBy,
    HomeStatisticsPageComponent,
]
})
export class StatisticsModule { }
