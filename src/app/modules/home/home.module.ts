import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { HomeRoutingModule } from './home-routing.module';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { DeparturePageComponent } from './pages/departure-page/departure-page.component';
import { SharedModule } from '@shared/shared.module';


@NgModule({
  declarations: [
    HomePageComponent,
    DeparturePageComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    SharedModule,
    ReactiveFormsModule
  ]
})
export class HomeModule { }
