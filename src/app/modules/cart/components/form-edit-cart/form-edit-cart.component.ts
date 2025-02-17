import { Component, Input, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import {
  MatSnackBar,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { CartData, CartLocation } from '@core/models/Cart';
import { CartDataService } from '@core/services/cart-data.service';

@Component({
  selector: 'app-form-edit-cart',
  templateUrl: './form-edit-cart.component.html',
  styleUrls: ['./form-edit-cart.component.scss'],
})
export class FormEditCartComponent implements OnInit {
  formCart: FormGroup;
  selectedColor: string = 'primary';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  @Input() formCartDataInput: CartData[] = [] as CartData[];

  locations: CartLocation[] = [
    {
      name: 'Plaza Centenario',
      linkMap: 'https://maps.app.goo.gl/QrwMsGHRptTyS6hu5',
    },
    {
      name: 'Parque Central',
      linkMap: 'https://maps.app.goo.gl/abcd1234'
    },
  ];

  constructor(
    private cartDataService: CartDataService,
    private fb: FormBuilder,
    private _snackBar: MatSnackBar
  ) {
    this.formCart = this.fb.group({
      cart: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.cartFormArray.clear();
    this.formCartDataInput.forEach((cart: CartData) => {
      this.cartFormArray.push(this.createCartGroup(cart));
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

  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action, {
      verticalPosition: this.verticalPosition,
    });
  }

  get cartFormArray(): FormArray {
    return this.formCart.get('cart') as FormArray;
  }

  onChangeInput(e: any, key: string, indexChange: number) {
    const control = this.cartFormArray.at(indexChange);
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

  deleteInputForm(index: number) {
    this.cartFormArray.removeAt(index);
  }

  rollbackInputForm() {
    this.initializeForm();
  }

  submitForm() {
    this.openSnackBar('Salidas actualizadas! 😉', 'ok');
    const cart = this.formCart.value.cart;
    this.cartDataService.putCartAssignment({ cart });
  }
}
