import { toSignal } from '@angular/core/rxjs-interop';
import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';

import { CartData, CartDataArray } from '@core/models/Cart';
import { CartDataService } from '@core/services/cart-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { CartAssignmentCardsComponent } from '../../../../shared/components/cart-assignment-cards/cart-assignment-cards.component';
import { RouterLink } from '@angular/router';
import { map, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-cart-page',
  templateUrl: './cart-page.component.html',
  styleUrls: ['./cart-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CartAssignmentCardsComponent, RouterLink],
})
export class CartPageComponent {
  private cartDataService = inject(CartDataService);
  private spinner = inject(SpinnerService);

  isAdmin = signal<boolean>(false);

  cartData = toSignal(
    this.cartDataService.getCartAssignment().pipe(
      map((cartArray: CartDataArray) => {
        return cartArray.cart.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
      }),
      finalize(() => this.spinner.cerrarSpinner()),
    ),
    { initialValue: [] as CartData[] },
  );

  constructor() {
    this.spinner.cargarSpinner();
    this.isAdmin.set(!!localStorage.getItem('tokenAdmin'));
  }
}
