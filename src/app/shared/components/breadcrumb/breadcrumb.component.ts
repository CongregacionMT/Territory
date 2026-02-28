import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BreadcrumbItem } from '@core/models/Breadcrumb';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  imports: [RouterLink],
})
export class BreadcrumbComponent {
  readonly routerBreadcrum = input<BreadcrumbItem[]>([]);
  readonly returnBack = '../';

  readonly breadcrumbItems = computed(() => {
    const list = this.routerBreadcrum() || [];
    return list.slice(0, -1);
  });

  readonly ultimateElement = computed(() => {
    const list = this.routerBreadcrum() || [];
    return list.length > 0 ? list[list.length - 1].route : '';
  });
}
