import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { TerritoryPageComponent } from './pages/territory-page/territory-page.component';
import { DeparturePageComponent } from './pages/departure-page/departure-page.component';


@NgModule({
  declarations: [
    HomePageComponent,
    TerritoryPageComponent,
    DeparturePageComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule
  ]
})
export class HomeModule { }
