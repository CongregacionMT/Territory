import { Component, OnInit, inject } from '@angular/core';
import { CartData, CartLocation } from '@core/models/Cart';
import { CartDataService } from '@core/services/cart-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { forkJoin } from 'rxjs';
import { FormEditCartComponent } from '../../components/form-edit-cart/form-edit-cart.component';

@Component({
    selector: 'app-cart-edit-page',
    templateUrl: './cart-edit-page.component.html',
    styleUrls: ['./cart-edit-page.component.scss'],
    imports: [FormEditCartComponent]
})
export class CartEditPageComponent implements OnInit {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private cartDataService = inject(CartDataService);
  private spinner = inject(SpinnerService);

  dataLoaded: boolean = false;
  routerBreadcrum: any = [];
  formCartData: CartData[] = [] as CartData[];
  formLocationsData: CartLocation[] = [] as CartLocation[];

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor(){
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
  }

  ngOnInit(): void {
    this.spinner.cargarSpinner();
    this.routerBreadcrum = this.routerBreadcrum[14];

    forkJoin({
      cartAssignment: this.cartDataService.getCartAssignment(),
      locations: this.cartDataService.getLocations()
    }).subscribe({
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
