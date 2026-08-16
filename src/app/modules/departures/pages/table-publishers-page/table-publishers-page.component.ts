import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, ChangeDetectionStrategy , DestroyRef} from '@angular/core';
import { SpinnerService } from '@core/services/spinner.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { TerritoryDataService } from '../../../../core/services/territory-data.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { NgClass } from '@angular/common';

@Component({
    selector: 'app-table-publishers-page',
    templateUrl: './table-publishers-page.component.html',
    styleUrls: ['./table-publishers-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [BreadcrumbComponent, NgClass]
})
export class TablePublishersPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territoriyDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);

  routerBreadcrum: any = [];
  groupList: any[] = [];constructor(){
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

    this.spinner.cargarSpinner();
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
  }

  ngOnInit(): void {
    this.spinner
    this.routerBreadcrum = this.routerBreadcrum[12];
    this.territoriyDataService.getGroupList().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.groupList = data;
        this.spinner.cerrarSpinner();
      }
    });
  }

}
