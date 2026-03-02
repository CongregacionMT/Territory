import { Component, OnInit, inject } from '@angular/core';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { Group } from '@core/models/Group';

@Component({
  selector: 'app-home-departure-page',
  templateUrl: './home-departure-page.component.html',
  styleUrls: ['./home-departure-page.component.scss'],
  imports: [BreadcrumbComponent, CardXlComponent, RouterLink],
})
export class HomeDeparturePageComponent implements OnInit {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private router = inject(Router);

  isAdmin: boolean = false;
  routerBreadcrum: any = [];
  groupKeys: any[] = [];

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    const routerBreadcrumMockService = this.routerBreadcrumMockService;

    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    localStorage.getItem('tokenAdmin')
      ? (this.isAdmin = true)
      : (this.isAdmin = false);
  }

  ngOnInit(): void {
    this.spinner.cargarSpinner();
    this.routerBreadcrum = this.routerBreadcrum[1];

    this.territoryDataService.getGroupList().subscribe((groups: Group[]) => {
      this.groupKeys = [];

      if (groups && groups.length > 0) {
        // Sort groups by number (id is typically "Grupo 1", "Grupo 2", etc.)
        const sortedGroups = groups.sort((a, b) => {
          const numA = parseInt(a.id.replace('Grupo ', '')) || 0;
          const numB = parseInt(b.id.replace('Grupo ', '')) || 0;
          return numA - numB;
        });

        sortedGroups.forEach((group) => {
          const groupNum = parseInt(group.id.replace('Grupo ', '')) || 0;
          this.groupKeys.push({
            name: group.id,
            src: '../../../assets/img/group.png',
            link: `grupo/${groupNum}`,
          });
        });
      } else {
        // No groups defined, show general departures
        this.groupKeys.push({
          name: 'Salidas generales',
          src: '../../../assets/img/group.png',
          link: `grupo/0`,
        });
      }

      this.spinner.cerrarSpinner();

      // If only one option, automatically redirect unless the user is an admin
      if (this.groupKeys.length === 1) {
        if (
          !localStorage.getItem('tokenAdmin') &&
          !sessionStorage.getItem('redirectedToGroup0')
        ) {
          sessionStorage.setItem('redirectedToGroup0', 'true');
          const targetLink = this.groupKeys[0].link;
          this.router.navigate(['/salidas/' + targetLink]);
        }
      }
    });
  }
}
