import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, ChangeDetectionStrategy , DestroyRef} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { CartData, CartDataArray } from '@core/models/Cart';
import { CartDataService } from '@core/services/cart-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { TableCartAssignmentComponent } from '../../../../shared/components/table-cart-assignment/table-cart-assignment.component';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-cart-page',
    templateUrl: './cart-page.component.html',
    styleUrls: ['./cart-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [BreadcrumbComponent, TableCartAssignmentComponent, RouterLink]
})
export class CartPageComponent implements OnInit{
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private cartDataService = inject(CartDataService);
  private fb = inject(FormBuilder);
  private spinner = inject(SpinnerService);
  private destroyRef = inject(DestroyRef);

  isAdmin: boolean = false;
  routerBreadcrum: any = [];
  cartData$: CartData[] = [];

  constructor(){
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

    this.spinner.cargarSpinner();
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    localStorage.getItem('tokenAdmin') ? this.isAdmin = true : this.isAdmin = false;
  }
  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[11];
    this.cartDataService.getCartAssignment().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (cartArray: CartDataArray) => {
        // Tabla de asignación del carrito
        this.cartData$ = cartArray.cart;
        this.cartData$.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getTime() - dateB.getTime();
        });
        this.cartDataService.getCartAssignment().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.spinner.cerrarSpinner();
          }
        });
      }
    })
  }
}
