import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@shared/shared.module';

import { StatisticsRoutingModule } from './statistics-routing.module';
import { StatisticsPageComponent } from './pages/statistics-page/statistics-page.component';
import { TimesAssigned } from '@core/pipes/times-assigned.pipe';


@NgModule({
  declarations: [
    StatisticsPageComponent,
    TimesAssigned
  ],
  imports: [
    CommonModule,
    StatisticsRoutingModule,
    SharedModule
  ]
})
export class StatisticsModule { }
