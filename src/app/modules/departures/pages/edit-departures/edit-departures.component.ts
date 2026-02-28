import {
  Component,
  OnInit,
  inject,
  ViewChild,
  HostListener,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatSnackBar,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { DepartureData, Departure } from '@core/models/Departures';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { FormEditDeparturesComponent } from '../../components/form-edit-departures/form-edit-departures.component';
import { CanComponentDeactivate } from '@core/guards/unsaved-changes.guard';

@Component({
  selector: 'app-edit-departures',
  templateUrl: './edit-departures.component.html',
  styleUrls: ['./edit-departures.component.scss'],
  imports: [ReactiveFormsModule, FormEditDeparturesComponent],
})
export class EditDeparturesComponent implements OnInit, CanComponentDeactivate {
  @ViewChild(FormEditDeparturesComponent)
  formEditComponent!: FormEditDeparturesComponent;
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private _snackBar = inject(MatSnackBar);

  dataLoaded: boolean = false;
  routerBreadcrum: any = [];
  dateDeparture: any = new FormControl('');
  selectedWeekRange: string = '';
  formDepartureData: Departure[] = {} as Departure[];
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  isSaved: boolean = false;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
  }
  ngOnInit(): void {
    this.spinner.cargarSpinner();
    this.routerBreadcrum = this.routerBreadcrum[11];
    this.territoryDataService.getDateDepartures().subscribe({
      next: (res) => {
        // Manejo seguro de nulos/indefinidos del documento
        const dateStr = res?.date;
        const initialDate =
          dateStr && !isNaN(new Date(dateStr + 'T00:00:00').getTime())
            ? dateStr
            : new Date().toISOString().split('T')[0];

        const dateObj = new Date(initialDate + 'T00:00:00');
        const monday = this.getMonday(dateObj);

        if (!isNaN(monday.getTime())) {
          const mondayStr = monday.toISOString().split('T')[0];
          this.dateDeparture.setValue(mondayStr);
          this.selectedWeekRange = this.formatWeekRange(monday);
        }

        this.dateDeparture.markAsPristine();
        this.spinner.cerrarSpinner();
      },
    });
    this.dateDeparture.valueChanges.subscribe((value: string) => {
      this.isSaved = false;
      if (value) {
        const dateObj = new Date(value + 'T00:00:00');
        if (isNaN(dateObj.getTime())) return;

        const monday = this.getMonday(dateObj);
        if (isNaN(monday.getTime())) return;

        const mondayStr = monday.toISOString().split('T')[0];

        // Si el usuario seleccionó un día que no es lunes, lo ajustamos
        if (value !== mondayStr) {
          this.dateDeparture.setValue(mondayStr, { emitEvent: false });
        }
        this.selectedWeekRange = this.formatWeekRange(monday);
      }
    });
    this.territoryDataService
      .getDepartures()
      .subscribe((departure: DepartureData) => {
        this.dataLoaded = true;
        this.formDepartureData = departure.departure;
      });
  }
  updateDate() {
    this._snackBar.open(`Semana actualizada: ${this.selectedWeekRange}`, 'Ok', {
      verticalPosition: this.verticalPosition,
    });
    this.territoryDataService.putDate({ date: this.dateDeparture.value });
    this.dateDeparture.markAsPristine();
    this.isSaved = true;
    // Si se actualiza la fecha, marcamos el formulario como guardado
    if (this.formEditComponent) {
      this.formEditComponent.isSaved = true;
    }
  }

  canDeactivate(): boolean {
    const isChildDirty =
      this.formEditComponent && this.formEditComponent.isDirty();
    const isMainDirty = this.dateDeparture.dirty;
    const childSaved = this.formEditComponent
      ? this.formEditComponent.isSaved
      : true;

    if ((isChildDirty || isMainDirty) && (!this.isSaved || !childSaved)) {
      return confirm(
        '⚠️ Tienes cambios sin guardar. Si sales ahora, perderás lo que has editado. ¿Estás seguro de que quieres salir?',
      );
    }
    return true;
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    const isChildDirty =
      this.formEditComponent && this.formEditComponent.isDirty();
    const isMainDirty = this.dateDeparture.dirty;
    const childSaved = this.formEditComponent
      ? this.formEditComponent.isSaved
      : true;

    if ((isChildDirty || isMainDirty) && (!this.isSaved || !childSaved)) {
      $event.returnValue = 'Tienes cambios sin guardar.';
    }
  }

  private getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  private formatWeekRange(monday: Date): string {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
    };
    const mondayStr = monday.toLocaleDateString('es-ES', options);
    const sundayStr = sunday.toLocaleDateString('es-ES', options);

    return `${mondayStr} al ${sundayStr}`;
  }
}
