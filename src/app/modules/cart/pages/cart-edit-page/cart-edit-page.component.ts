import { Component, OnInit } from '@angular/core';
import { CartData, CartDataArray } from '@core/models/Cart';
import { CartDataService } from '@core/services/cart-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';

@Component({
  selector: 'app-cart-edit-page',
  templateUrl: './cart-edit-page.component.html',
  styleUrls: ['./cart-edit-page.component.scss']
})
export class CartEditPageComponent implements OnInit{
  dataLoaded: boolean = false;
  routerBreadcrum: any = [];
  formCartData: CartData[] = {} as CartData[];
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private cartDataService: CartDataService,
    private spinner: SpinnerService,
  ){
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
  }
  ngOnInit(): void {
    this.spinner.cargarSpinner();
    this.routerBreadcrum = this.routerBreadcrum[14];
    this.cartDataService.getCartAssignment().subscribe({
      next: (date) => {
        this.spinner.cerrarSpinner();
      }
    });
    this.cartDataService.getCartAssignment().subscribe((cartArray: CartDataArray) => {
      this.dataLoaded = true;
      this.formCartData = cartArray.cart;
    })
  }
}
