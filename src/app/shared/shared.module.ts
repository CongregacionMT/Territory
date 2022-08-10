import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import {RouterModule} from '@angular/router';
import { BreadcrumbComponent } from "./components/breadcrumb/breadcrumb.component";
import { CardSComponent } from "./components/card-s/card-s.component";
import { CardXlComponent } from "./components/card-xl/card-xl.component";

@NgModule({
    declarations: [
        BreadcrumbComponent,
        CardSComponent,
        CardXlComponent
    ],
    imports: [
        CommonModule,
        RouterModule
    ],
    exports: [
        BreadcrumbComponent,
        CardSComponent,
        CardXlComponent
    ]
})
export class SharedModule { }