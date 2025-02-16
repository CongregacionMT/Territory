import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CartRoutingModule } from './cart-routing.module';
import { CartPageComponent } from './pages/cart-page/cart-page.component';
import { CartEditPageComponent } from './pages/cart-edit-page/cart-edit-page.component';
import { SharedModule } from "../../shared/shared.module";


@NgModule({
  declarations: [
    CartPageComponent,
    CartEditPageComponent
  ],
  imports: [
    CommonModule,
    CartRoutingModule,
    SharedModule
]
})
export class CartModule { }
