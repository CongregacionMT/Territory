import { Component, OnInit, inject, input, ChangeDetectionStrategy } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSnackBar, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { CartData, CartLocation } from '@core/models/Cart';
import { CartDataService } from '@core/services/cart-data.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-form-edit-cart',
  templateUrl: './form-edit-cart.component.html',
  styleUrls: ['./form-edit-cart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgClass],
})
export class FormEditCartComponent implements OnInit {
  private cartDataService = inject(CartDataService);
  private fb = inject(FormBuilder);
  private _snackBar = inject(MatSnackBar);

  formCart: FormGroup;
  formLocations: FormGroup;
  locations: CartLocation[] = [];
  selectedColor: string = 'primary';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  readonly formCartDataInput = input<CartData[]>([] as CartData[]);
  readonly formLocationsDataInput = input<CartLocation[]>([] as CartLocation[]);
  constructor() {
    this.formCart = this.fb.group({
      cart: this.fb.array([]),
    });

    this.formLocations = this.fb.group({
      locations: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.initializeForm();
    this.initializeLocationsForm();
  }

  initializeForm(): void {
    this.cartFormArray.clear();
    if (this.formCartDataInput().length === 0) {
      this.addInputForm();
    } else {
      this.formCartDataInput().forEach((cart: CartData) => {
        this.cartFormArray.push(this.createCartGroup(cart));
      });
    }
  }

  initializeLocationsForm(): void {
    this.locationsFormArray.clear();
    if (this.formLocationsDataInput().length === 0) {
      this.addLocationForm();
    } else {
      this.formLocationsDataInput().forEach((location: CartLocation) => {
        this.locations.push(location);
        this.locationsFormArray.push(this.createLocationGroup(location));
      });
    }
  }

  createCartGroup(cart: CartData): FormGroup {
    return this.fb.group({
      assignment: new FormControl(cart.assignment, (c) => Validators.required(c)),
      date: new FormControl(cart.date, (c) => Validators.required(c)),
      schedule: new FormControl(cart.schedule, (c) => Validators.required(c)),
      location: new FormControl(cart.location, (c) => Validators.required(c)),
      color: new FormControl(cart.color, (c) => Validators.required(c)),
    });
  }

  createLocationGroup(location: CartLocation): FormGroup {
    return this.fb.group({
      name: new FormControl(location.name, (c) => Validators.required(c)),
      linkMap: new FormControl(location.linkMap, (c) => Validators.required(c)),
    });
  }

  openSnackBar(message: string, action: string): void {
    this._snackBar.open(message, action, {
      verticalPosition: this.verticalPosition,
    });
  }

  get cartFormArray(): FormArray {
    return this.formCart.get('cart') as FormArray;
  }

  get locationsFormArray(): FormArray {
    return this.formLocations.get('locations') as FormArray;
  }

  onChangeInput(e: Event, key: string, indexChange: number): void {
    const input = e.target as HTMLInputElement | HTMLSelectElement;
    const control = this.cartFormArray.at(indexChange);
    if (key === 'location') {
      const selectedLocation = this.locations.find((location) => location.name === input.value);
      if (selectedLocation) {
        control.get(key)?.setValue(selectedLocation);
      }
    } else {
      control.get(key)?.setValue(input.value);
    }
  }

  onChangeLocationInput(e: Event, key: string, indexChange: number): void {
    const input = e.target as HTMLInputElement;
    const control = this.locationsFormArray.at(indexChange);
    control.get(key)?.setValue(input.value);
  }

  onChangeColor(event: Event, index: number): void {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    const selectedValue = input.value;
    this.cartFormArray.at(index).get('color')?.setValue(selectedValue);
  }

  addInputForm(): void {
    this.cartFormArray.push(
      this.createCartGroup({
        assignment: '',
        date: '',
        schedule: '',
        location: { name: '', linkMap: '' },
        color: 'secondary',
      }),
    );
  }

  addLocationForm(): void {
    this.locationsFormArray.push(
      this.createLocationGroup({
        name: '',
        linkMap: '',
      }),
    );
  }

  deleteInputForm(index: number): void {
    this.cartFormArray.removeAt(index);
  }

  deleteLocationForm(index: number): void {
    this.locationsFormArray.removeAt(index);
  }

  rollbackInputForm(): void {
    this.initializeForm();
  }

  submitForm(): void {
    this.openSnackBar('Salidas actualizadas! 😉', 'ok');
    const formValue = this.formCart.value as { cart: CartData[] };
    const cart = formValue.cart;
    void this.cartDataService.putCartAssignment({ cart });
  }

  submitLocationsForm(): void {
    this.openSnackBar('Ubicaciones actualizadas! 😉', 'ok');
    const formValue = this.formLocations.value as { locations: CartLocation[] };
    const locations = formValue.locations;
    void this.cartDataService.putLocations({ locations });
  }

  getColorSelectClasses(color: string): string {
    switch (color) {
      case 'primary':
        return 'bg-blue-900/50 text-blue-300 border-blue-700/50';
      case 'success':
        return 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50';
      case 'warning':
        return 'bg-amber-900/50 text-amber-300 border-amber-700/50';
      case 'danger':
        return 'bg-red-900/50 text-red-300 border-red-700/50';
      case 'info':
        return 'bg-cyan-900/50 text-cyan-300 border-cyan-700/50';
      case 'secondary':
        return 'bg-slate-800 text-slate-300 border-slate-600';
      case 'light':
        return 'bg-slate-100 text-slate-900 border-slate-300';
      case 'dark':
        return 'bg-slate-950 text-slate-300 border-slate-700';
      default:
        return 'bg-slate-900 text-white border-slate-700';
    }
  }
}
