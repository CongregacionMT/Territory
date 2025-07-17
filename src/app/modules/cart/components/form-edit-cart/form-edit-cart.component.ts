import { Component, Input, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { CartData, CartLocation } from '@core/models/Cart';
import { CartDataService } from '@core/services/cart-data.service';

@Component({
    selector: 'app-form-edit-cart',
    templateUrl: './form-edit-cart.component.html',
    styleUrls: ['./form-edit-cart.component.scss'],
    imports: [ReactiveFormsModule]
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
  @Input() formCartDataInput: CartData[] = [] as CartData[];
  @Input() formLocationsDataInput: CartLocation[] = [] as CartLocation[];

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

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
    this.formCartDataInput.forEach((cart: CartData) => {
      this.cartFormArray.push(this.createCartGroup(cart));
    });
  }

  initializeLocationsForm(): void {
    this.locationsFormArray.clear();
    this.formLocationsDataInput.forEach((location: CartLocation) => {
      this.locations.push(location);
      this.locationsFormArray.push(this.createLocationGroup(location));
    });
  }

  createCartGroup(cart: CartData): FormGroup {
    return this.fb.group({
      assignment: new FormControl(cart.assignment, Validators.required),
      date: new FormControl(cart.date, Validators.required),
      schedule: new FormControl(cart.schedule, Validators.required),
      location: new FormControl(cart.location, Validators.required),
      color: new FormControl(cart.color, Validators.required),
    });
  }

  createLocationGroup(location: CartLocation): FormGroup {
    return this.fb.group({
      name: new FormControl(location.name, Validators.required),
      linkMap: new FormControl(location.linkMap, Validators.required),
    });
  }

  openSnackBar(message: string, action: string) {
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

  onChangeInput(e: any, key: string, indexChange: number) {
    const control = this.cartFormArray.at(indexChange);
    if (key === 'location') {
      const selectedLocation = this.locations.find(location => location.name === e.target.value);
      if (selectedLocation) {
        control.get(key)?.setValue(selectedLocation);
      }
    } else {
      control.get(key)?.setValue(e.target.value);
    }
  }

  onChangeLocationInput(e: any, key: string, indexChange: number) {
    const control = this.locationsFormArray.at(indexChange);
    control.get(key)?.setValue(e.target.value);
  }

  onChangeColor(event: any, index: number) {
    const selectedValue = event.target.value;
    this.cartFormArray.at(index).get('color')?.setValue(selectedValue);
  }

  addInputForm() {
    this.cartFormArray.push(
      this.createCartGroup({
        assignment: '',
        date: '',
        schedule: '',
        location: { name: '', linkMap: '' },
        color: 'secondary',
      } as CartData)
    );
  }

  addLocationForm() {
    this.locationsFormArray.push(
      this.createLocationGroup({
        name: '',
        linkMap: '',
      } as CartLocation)
    );
  }

  deleteInputForm(index: number) {
    this.cartFormArray.removeAt(index);
  }

  deleteLocationForm(index: number) {
    this.locationsFormArray.removeAt(index);
  }

  rollbackInputForm() {
    this.initializeForm();
  }

  submitForm() {
    this.openSnackBar('Salidas actualizadas! 😉', 'ok');
    const cart = this.formCart.value.cart;
    this.cartDataService.putCartAssignment({ cart });
  }

  submitLocationsForm() {
    this.openSnackBar('Ubicaciones actualizadas! 😉', 'ok');
    const locations = this.formLocations.value.locations;
    this.cartDataService.putLocations({ locations });
  }
}
