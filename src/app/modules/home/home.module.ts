import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { HomeRoutingModule } from './home-routing.module';
import { HomePageComponent } from './pages/home-page/home-page.component';



@NgModule({
    imports: [
    CommonModule,
    HomeRoutingModule,
    ReactiveFormsModule,
    HomePageComponent
]
})
export class HomeModule { }
