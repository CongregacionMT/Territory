import { toSignal } from '@angular/core/rxjs-interop';
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CartDataService } from '@core/services/cart-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { forkJoin } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import { CartAssignmentFormComponent } from '../../components/cart-assignment-form/cart-assignment-form.component';
import { CartLocationsFormComponent } from '../../components/cart-locations-form/cart-locations-form.component';

@Component({
  selector: 'app-cart-edit-page',
  templateUrl: './cart-edit-page.component.html',
  styleUrls: ['./cart-edit-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CartAssignmentFormComponent, CartLocationsFormComponent],
})
export class CartEditPageComponent {
  private cartDataService = inject(CartDataService);
  private spinner = inject(SpinnerService);

  pageData = toSignal(
    forkJoin({
      cartAssignment: this.cartDataService.getCartAssignment(),
      locations: this.cartDataService.getLocations(),
    }).pipe(
      map((data) => ({
        cart: data.cartAssignment.cart,
        locations: data.locations.locations,
      })),
      finalize(() => this.spinner.cerrarSpinner()),
    ),
  );

  constructor() {
    this.spinner.cargarSpinner();
  }
}
