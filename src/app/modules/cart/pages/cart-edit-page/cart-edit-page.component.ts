import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, ChangeDetectionStrategy , DestroyRef} from '@angular/core';
import { CartData, CartLocation } from '@core/models/Cart';
import { CartDataService } from '@core/services/cart-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { forkJoin } from 'rxjs';
import { FormEditCartComponent } from '../../components/form-edit-cart/form-edit-cart.component';

@Component({
    selector: 'app-cart-edit-page',
    templateUrl: './cart-edit-page.component.html',
    styleUrls: ['./cart-edit-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [FormEditCartComponent]
})
export class CartEditPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);  private cartDataService = inject(CartDataService);
  private spinner = inject(SpinnerService);

  dataLoaded: boolean = false;  formCartData: CartData[] = [] as CartData[];
  formLocationsData: CartLocation[] = [] as CartLocation[];constructor(){  }

  ngOnInit(): void {
    this.spinner.cargarSpinner();
    forkJoin({
      cartAssignment: this.cartDataService.getCartAssignment(),
      locations: this.cartDataService.getLocations()
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ cartAssignment, locations }) => {
        this.formCartData = cartAssignment.cart;
        this.formLocationsData = locations.locations;
        this.dataLoaded = true;
        this.spinner.cerrarSpinner();
      },
      error: (error) => {
        this.spinner.cerrarSpinner();
        console.error('Error loading data', error);
      }
    });
  }
}
