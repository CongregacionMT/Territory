import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import {RouterModule} from '@angular/router';
import { BreadcrumbComponent } from "./components/breadcrumb/breadcrumb.component";
import { CardSComponent } from "./components/card-s/card-s.component";
import { CardXlComponent } from "./components/card-xl/card-xl.component";
import { ModalComponent } from "./components/modal/modal.component";
import { FocusInvalidInputDirective } from './directives/focus-invalid-input.directive';
import { TableDeparturesComponent } from './components/table-departures/table-departures.component';
import { MatDialogModule } from "@angular/material/dialog";
import { ConfirmDialogComponent } from "./components/confirm-dialog/confirm-dialog.component";
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {MatSnackBarModule} from '@angular/material/snack-bar';


@NgModule({
    declarations: [
        BreadcrumbComponent,
        CardSComponent,
        CardXlComponent,
        FocusInvalidInputDirective,
        ModalComponent,
        TableDeparturesComponent,
        ConfirmDialogComponent,
    ],
    imports: [
        CommonModule,
        RouterModule,
        MatDialogModule,
        MatIconModule,
        MatButtonModule,
        MatSnackBarModule,
    ],
    exports: [
        BreadcrumbComponent,
        CardSComponent,
        CardXlComponent,
        FocusInvalidInputDirective,
        ModalComponent,
        TableDeparturesComponent
    ]
})
export class SharedModule { }
