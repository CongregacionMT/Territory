import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { CartData, CartDataArray } from '@core/models/Cart';
import { CartDataService } from '@core/services/cart-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';

@Component({
    selector: 'app-cart-page',
    templateUrl: './cart-page.component.html',
    styleUrls: ['./cart-page.component.scss'],
    standalone: false
})
export class CartPageComponent implements OnInit{
  isAdmin: boolean = false;
  routerBreadcrum: any = [];
  cartData$: CartData[] = [];
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private cartDataService: CartDataService,
    private fb: FormBuilder,
    private spinner: SpinnerService,
  ){
    this.spinner.cargarSpinner();
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    localStorage.getItem('tokenAdmin') ? this.isAdmin = true : this.isAdmin = false;
  }
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[13];
    this.cartDataService.getCartAssignment().subscribe({
      next: (cartArray: CartDataArray) => {
        // Tabla de asignación del carrito
        this.cartData$ = cartArray.cart;
        this.cartData$.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
        this.cartDataService.getCartAssignment().subscribe({
          next: () => {
            this.spinner.cerrarSpinner();
          }
        });
      }
    })
  }
}
