import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UsersRoutingModule } from './users-routing.module';
import { UsersPageComponent } from './users-page/users-page.component';

import { ReactiveFormsModule } from '@angular/forms';


@NgModule({
    imports: [
    CommonModule,
    UsersRoutingModule,
    ReactiveFormsModule,
    UsersPageComponent,
]
})
export class UsersModule { }
