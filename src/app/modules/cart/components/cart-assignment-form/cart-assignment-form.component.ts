/* eslint-disable @typescript-eslint/unbound-method */
import {
  Component,
  inject,
  input,
  ChangeDetectionStrategy,
  OnInit,
  DestroyRef,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartData, CartLocation } from '@core/models/Cart';
import { CartDataService } from '@core/services/cart-data.service';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-cart-assignment-form',
  templateUrl: './cart-assignment-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgClass],
})
export class CartAssignmentFormComponent implements OnInit {
  private cartDataService = inject(CartDataService);
  private fb = inject(FormBuilder);
  private _snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  readonly cartData = input.required<CartData[]>();

  formCart: FormGroup = this.fb.group({
    cart: this.fb.array([]),
  });

  locations: CartLocation[] = [];

  ngOnInit(): void {
    // Load locations for the dropdown
    this.cartDataService
      .getLocations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        this.locations = res.locations;
      });

    this.initializeForm();
  }

  get cartFormArray(): FormArray {
    return this.formCart.get('cart') as FormArray;
  }

  initializeForm(): void {
    this.cartFormArray.clear();
    const currentData = this.cartData();
    if (currentData.length === 0) {
      this.addInputForm();
    } else {
      currentData.forEach((cart) => {
        this.cartFormArray.push(this.createCartGroup(cart));
      });
    }
  }

  createCartGroup(cart: Partial<CartData>): FormGroup {
    return this.fb.group({
      assignment: new FormControl(cart.assignment || '', Validators.required),
      date: new FormControl(cart.date || '', Validators.required),
      schedule: new FormControl(cart.schedule || '', Validators.required),
      location: new FormControl(cart.location?.name || '', Validators.required),
      color: new FormControl(cart.color || 'secondary', Validators.required),
    });
  }

  addInputForm(): void {
    this.cartFormArray.push(this.createCartGroup({}));
  }

  deleteInputForm(index: number): void {
    this.cartFormArray.removeAt(index);
  }

  submitForm(): void {
    if (this.formCart.invalid) {
      this.openSnackBar('Por favor completa los campos requeridos.', 'cerrar');
      return;
    }

    // Remap the raw string location back to an object structure for saving
    const formValue = this.formCart.value as {
      cart: {
        assignment: string;
        date: string;
        schedule: string;
        location: string;
        color: string;
      }[];
    };

    const cart: CartData[] = formValue.cart.map((item) => {
      const selectedLocation = this.locations.find((l) => l.name === item.location);
      return {
        ...item,
        location: selectedLocation || { name: item.location, linkMap: '' },
      };
    });

    void this.cartDataService.putCartAssignment({ cart }).then(() => {
      this.openSnackBar('¡Salidas actualizadas exitosamente! 😉', 'ok');
    });
  }

  openSnackBar(message: string, action: string): void {
    this._snackBar.open(message, action, {
      verticalPosition: 'top',
      duration: 3000,
    });
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
