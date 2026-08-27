import {
  Component,
  OnInit,
  LOCALE_ID,
  inject,
  viewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DataRural } from '@core/models/DataRural';
import { TerritoryDataService } from '../../../../core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { ModalFormRuralComponent } from '@modules/territory/components/modal-form-rural/modal-form-rural.component';
import { ModeModal } from '@core/models/ModeModal';
import { DialogService } from '@core/services/dialog.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { mapConfig } from '@core/config/maps.config';
import { NetworkService } from '@core/services/network.service';
import { OfflineMapViewerComponent } from '../../components/offline-map-viewer/offline-map-viewer.component';
import { AuthService } from '@core/services/auth.service';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-mapas',
  templateUrl: './mapas.component.html',
  styleUrls: ['./mapas.component.scss'],
  providers: [{ provide: LOCALE_ID, useValue: 'es' }, DialogService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OfflineMapViewerComponent, MatDialogModule],
})
export class MapasComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private domSanitizer = inject(DomSanitizer);
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private dialogService = inject(DialogService);
  private destroyRef = inject(DestroyRef);
  public networkService = inject(NetworkService);
  public authService = inject(AuthService);
  mapa: SafeHtml | undefined;
  kmlUrl: string | undefined;

  class: string = 'map-responsive';
  showRural: boolean = false;
  dataRural: DataRural[] = [];
  readonly modalFormRuralComponent = viewChild(ModalFormRuralComponent);
  constructor() {
    registerLocaleData(localeEs);
  }

  ngOnInit(): void {
    const path = this.activatedRoute.snapshot.url[0].path;
    const mapHtml = mapConfig.maps[path];
    console.log('[MapasComponent] ngOnInit ejecutado para el path:', path);
    console.log('[MapasComponent] Configuración de mapa encontrada:', mapHtml);
    console.log(
      '[MapasComponent] Estado de red detectado (online):',
      this.networkService.isOnline(),
    );

    if (mapHtml?.kmlUrl) {
      this.kmlUrl = mapHtml.kmlUrl;
      console.log('[MapasComponent] KML URL configurada:', this.kmlUrl);
    }

    if (mapHtml?.iframeHtml) {
      this.mapa = this.domSanitizer.bypassSecurityTrustHtml(mapHtml.iframeHtml);
      console.log('[MapasComponent] Iframe HTML configurado.');
    }

    if (path === 'rural') {
      this.spinner.cargarSpinner();
      this.territoryDataService
        .getTerritorieRural()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (road: DataRural[]) => {
            this.dataRural = road;
            this.showRural = true;
            this.spinner.cerrarSpinner();
          },
        });
    }
  }

  openModal(mode: ModeModal, form?: DataRural): void {
    const modalFormRuralComponent = this.modalFormRuralComponent();
    if (modalFormRuralComponent) {
      if (mode === 'creation') {
        modalFormRuralComponent.openModalCreation();
      } else if (mode === 'edition') {
        modalFormRuralComponent.openModalEdition(form);
      }
    }
  }

  deleteRoad(roadId: string | undefined): void {
    if (roadId) {
      this.dialogService
        .openDialog(
          { title: 'Eliminar camino', message: '¿Estás seguro de eliminar este camino?' },
          ConfirmDialogComponent,
        )
        .subscribe((confirmed) => {
          if (confirmed) {
            void this.territoryDataService.deleteRoad(roadId);
          }
        });
    }
  }
}
