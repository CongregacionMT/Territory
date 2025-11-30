import { Component, OnInit, LOCALE_ID, inject, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { DataRural } from '@core/models/DataRural';
import { TerritoryDataService } from '../../../../core/services/territory-data.service';
import { FormBuilder } from '@angular/forms';
import { SpinnerService } from '@core/services/spinner.service';
import { ModalFormRuralComponent } from '@modules/territory/components/modal-form-rural/modal-form-rural.component';
import { ModeModal } from '@core/models/ModeModal';
import { needConfirmation } from '@shared/decorators/confirm-dialog.decorator';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { mapConfig } from '@core/config/maps.config';

@Component({
    selector: 'app-mapas',
    templateUrl: './mapas.component.html',
    styleUrls: ['./mapas.component.scss'],
    providers: [{ provide: LOCALE_ID, useValue: 'es' }],
    imports: []
})
export class MapasComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private domSanitizer = inject(DomSanitizer);
  private territoriyDataService = inject(TerritoryDataService);
  private fb = inject(FormBuilder);
  private territorieDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);

  isAdmin: boolean = false;
  mapa: any;
  class: string = 'map-responsive';
  showRural: boolean = false;
  dataRural: DataRural[] = [];
  readonly modalFormRuralComponent = viewChild(ModalFormRuralComponent);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    registerLocaleData(localeEs);
  }

  ngOnInit(): void {
    const path = this.activatedRoute.snapshot.url[0].path;
    const mapHtml = mapConfig.maps[path];
    
    if (mapHtml) {
      this.mapa = this.domSanitizer.bypassSecurityTrustHtml(mapHtml);
    }
    
    if(path === 'rural'){
      this.spinner.cargarSpinner();
      this.territoriyDataService.getTerritorieRural().subscribe({
        next: (road: DataRural[]) => {
          this.dataRural = road;
          this.showRural = true;
          this.spinner.cerrarSpinner();
        }
      })
      this.isAdmin = localStorage.getItem('tokenAdmin') ? true : false;
    }
  }

  openModal(mode: ModeModal, form?: DataRural){
    const modalFormRuralComponent = this.modalFormRuralComponent();
    if(modalFormRuralComponent){
      if(mode === 'creation'){
        modalFormRuralComponent.openModalCreation();
      } else if (mode === 'edition'){
        modalFormRuralComponent.openModalEdition(form);
      }
    }
  }

  @needConfirmation({title: 'Eliminar camino', message: '¿Estás seguro de eliminar este camino?'})
  deleteRoad(roadId: string | undefined){
    if(roadId){
      this.territorieDataService.deleteRoad(roadId);
    }
  }
}
