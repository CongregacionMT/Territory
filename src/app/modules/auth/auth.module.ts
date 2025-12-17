import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { AuthRoutingModule } from './auth-routing.module';
import { LoginPageComponent } from './pages/login-page/login-page.component';


@NgModule({
    imports: [
    CommonModule,
    AuthRoutingModule,
    ReactiveFormsModule,
    LoginPageComponent
]
})
export class AuthModule { }
