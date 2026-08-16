import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { Group } from '@core/models/Group';
import { Departure, WeeklyDeparture } from '@core/models/Departures';
import { DeparturePdfService, PrintMode } from '@core/services/departure-pdf.service';
import { getWeekId } from '@shared/utils/date-utils';
import { forkJoin, take } from 'rxjs';

@Component({
  selector: 'app-home-departure-page',
  templateUrl: './home-departure-page.component.html',
  styleUrls: ['./home-departure-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [BreadcrumbComponent, CardXlComponent, RouterLink],
})
export class HomeDeparturePageComponent implements OnInit {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private router = inject(Router);
  private pdfService = inject(DeparturePdfService);

  isAdmin: boolean = false;
  routerBreadcrum: any = [];
  groupKeys: any[] = [];
  groups: Group[] = [];

  // Print state
  showPrintModal: boolean = false;
  isPrintingPdf: boolean = false;
  pdfGenerated: boolean = false;

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
      this.groups = groups;

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
            number: groupNum,
          });
        });
      } else {
        // No groups defined, show general departures
        this.groupKeys.push({
          name: 'Salidas generales',
          src: '../../../assets/img/group.png',
          link: `grupo/0`,
          number: 0,
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

  // ==========================================
  // Print functionality (all groups)
  // ==========================================

  openPrintModal(): void {
    this.showPrintModal = true;
    this.pdfGenerated = false;
  }

  closePrintModal(): void {
    this.showPrintModal = false;
  }

  async printPdf(mode: PrintMode): Promise<void> {
    this.isPrintingPdf = true;
    this.pdfGenerated = false;

    try {
      const currentWeekId = getWeekId(new Date());
      const nextWeekId = this.pdfService.getNextWeekId(currentWeekId);
      const printRange = this.pdfService.getPrintWeekRange(currentWeekId);

      // Fetch current week and next week departures
      forkJoin({
        current: this.territoryDataService.getWeeklyDeparture(currentWeekId).pipe(take(1)),
        next: this.territoryDataService.getWeeklyDeparture(nextWeekId).pipe(take(1)),
        master: this.territoryDataService.getDepartures().pipe(take(1)),
      }).subscribe({
        next: async (result: any) => {
          try {
            let currentDepartures: Departure[] = [];
            let nextDepartures: Departure[] = [];

            // Use weekly data if available, fallback to master
            if (result.current?.departure?.length > 0) {
              currentDepartures = result.current.departure;
            } else if (result.master?.departure?.length > 0) {
              currentDepartures = result.master.departure;
            }

            if (result.next?.departure?.length > 0) {
              nextDepartures = result.next.departure;
            }

            // Compose the Fri–Thu departures (all groups, unfiltered)
            const printDepartures = this.pdfService.getDeparturesForPrintWeek(
              currentDepartures,
              nextDepartures,
              currentWeekId
            );

            // Get all group numbers
            const groupNumbers = this.groupKeys.map((g: any) => g.number);

            const pdfBytes = await this.pdfService.generateAllGroupsPdf(
              printDepartures,
              printRange.label,
              mode,
              groupNumbers
            );

            const modeLabel = mode === 'color' ? 'color' : 'bn';
            const filename = `salidas_${currentWeekId}_todos_${modeLabel}.pdf`;
            this.pdfService.downloadPdf(pdfBytes, filename);

            this.isPrintingPdf = false;
            this.pdfGenerated = true;
            
            setTimeout(() => {
              this.showPrintModal = false;
              this.pdfGenerated = false;
            }, 3000);
          } catch (error) {
            console.error('Error generating PDF:', error);
          } finally {
            this.isPrintingPdf = false;
          }
        },
        error: (error: any) => {
          console.error('Error fetching departures for PDF:', error);
          this.isPrintingPdf = false;
        },
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      this.isPrintingPdf = false;
    }
  }
}
