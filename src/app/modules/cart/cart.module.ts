import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CartRoutingModule } from './cart-routing.module';
import { CartPageComponent } from './pages/cart-page/cart-page.component';
import { CartEditPageComponent } from './pages/cart-edit-page/cart-edit-page.component';
import { SharedModule } from "../../shared/shared.module";
import { FormEditCartComponent } from './components/form-edit-cart/form-edit-cart.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    CartPageComponent,
    CartEditPageComponent,
    FormEditCartComponent
  ],
  imports: [
    CommonModule,
    CartRoutingModule,
    SharedModule,
    ReactiveFormsModule,
    FormsModule
]
})
export class CartModule { }
