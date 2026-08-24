import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { CartData, CartDataArray } from '@core/models/Cart';
import { CartDataService } from '@core/services/cart-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { CartAssignmentCardsComponent } from '../../../../shared/components/cart-assignment-cards/cart-assignment-cards.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cart-page',
  templateUrl: './cart-page.component.html',
  styleUrls: ['./cart-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [CartAssignmentCardsComponent, RouterLink],
})
export class CartPageComponent implements OnInit {
  private cartDataService = inject(CartDataService);
  private fb = inject(FormBuilder);
  private spinner = inject(SpinnerService);
  private destroyRef = inject(DestroyRef);

  isAdmin: boolean = false;
  cartData$: CartData[] = [];

  constructor() {
    this.spinner.cargarSpinner();
    localStorage.getItem('tokenAdmin') ? (this.isAdmin = true) : (this.isAdmin = false);
  }
  ngOnInit(): void {
    this.cartDataService
      .getCartAssignment()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cartArray: CartDataArray) => {
          // Tabla de asignación del carrito
          this.cartData$ = cartArray.cart;
          this.cartData$.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA.getTime() - dateB.getTime();
          });
          this.cartDataService
            .getCartAssignment()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.spinner.cerrarSpinner();
              },
            });
        },
      });
  }
}
