import { Component, OnInit, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BreadcrumbItem } from '@core/models/Breadcrumb';

@Component({
    selector: 'app-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    styleUrls: ['./breadcrumb.component.scss'],
    imports: [RouterLink]
})
export class BreadcrumbComponent implements OnInit {
  readonly routerBreadcrum = input<BreadcrumbItem[]>();
  returnBack: string = "../";
  ultimateElement: string = "";
  constructor() {}

  ngOnInit(): void {
    const breadcrumArr = this.routerBreadcrum();
    if (breadcrumArr && breadcrumArr.length > 0) {
      this.ultimateElement = breadcrumArr[breadcrumArr.length - 1].route;
      breadcrumArr.pop();
    }
  }
}
