import { Component, inject, input, ChangeDetectionStrategy, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartLocation } from '@core/models/Cart';
import { CartDataService } from '@core/services/cart-data.service';

@Component({
  selector: 'app-cart-locations-form',
  templateUrl: './cart-locations-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
})
export class CartLocationsFormComponent implements OnInit {
  private cartDataService = inject(CartDataService);
  private fb = inject(FormBuilder);
  private _snackBar = inject(MatSnackBar);

  readonly locationsData = input.required<CartLocation[]>();

  formLocations: FormGroup = this.fb.group({
    locations: this.fb.array([]),
  });

  ngOnInit(): void {
    this.initializeForm();
  }

  get locationsFormArray(): FormArray {
    return this.formLocations.get('locations') as FormArray;
  }

  initializeForm(): void {
    this.locationsFormArray.clear();
    const currentData = this.locationsData();
    if (currentData.length === 0) {
      this.addLocationForm();
    } else {
      currentData.forEach((location) => {
        this.locationsFormArray.push(this.createLocationGroup(location));
      });
    }
  }

  createLocationGroup(location: Partial<CartLocation>): FormGroup {
    return this.fb.group({
      name: new FormControl(location.name || '', Validators.required.bind(Validators)),
      linkMap: new FormControl(location.linkMap || '', Validators.required.bind(Validators)),
    });
  }

  addLocationForm(): void {
    this.locationsFormArray.push(this.createLocationGroup({}));
  }

  deleteLocationForm(index: number): void {
    this.locationsFormArray.removeAt(index);
  }

  submitLocationsForm(): void {
    if (this.formLocations.invalid) {
      this.openSnackBar('Por favor completa los campos de ubicación.', 'cerrar');
      return;
    }

    const formValue = this.formLocations.value as { locations: CartLocation[] };

    void this.cartDataService.putLocations({ locations: formValue.locations }).then(() => {
      this.openSnackBar('¡Ubicaciones actualizadas exitosamente! 📍', 'ok');
    });
  }

  openSnackBar(message: string, action: string): void {
    this._snackBar.open(message, action, {
      verticalPosition: 'top',
      duration: 3000,
    });
  }
}
