import { Component, OnInit, ViewChild, LOCALE_ID } from '@angular/core';
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

@Component({
  selector: 'app-mapas',
  templateUrl: './mapas.component.html',
  styleUrls: ['./mapas.component.scss'],
  providers: [{ provide: LOCALE_ID, useValue: 'es' }]
})
export class MapasComponent implements OnInit {

  mapa: any;
  class: string = 'map-responsive';
  showRural: boolean = false;
  dataRural: DataRural[] = [];
  @ViewChild(ModalFormRuralComponent) modalFormRuralComponent: ModalFormRuralComponent | undefined;
  constructor(private activatedRoute: ActivatedRoute, private domSanitizer: DomSanitizer, private territoriyDataService: TerritoryDataService, private fb: FormBuilder, private territorieDataService: TerritoryDataService, private spinner: SpinnerService) {
    registerLocaleData(localeEs);
  }

  ngOnInit(): void {
    if(this.activatedRoute.snapshot.url[0].path === 'mariaTeresa'){
      this.mapa = this.domSanitizer.bypassSecurityTrustHtml(
        '<iframe src="https://www.google.com/maps/d/embed?mid=1H-aEAUqqCeX8rRRNykvly38QZIZJ76s&ehbc=2E312F" width="100%" height="100%" style="border: 0" loading="lazy" allowfullscreen></iframe>'
      )
    } else if (this.activatedRoute.snapshot.url[0].path === 'christophersen'){
      this.mapa = this.domSanitizer.bypassSecurityTrustHtml(
        '<iframe src="https://www.google.com/maps/d/embed?mid=1WYVbLbcT5UJDQawb4ahOIfdCwEfocFY&ehbc=2E312F" width="100%" height="100%" style="border: 0" loading="lazy" allowfullscreen></iframe>'
      )
    } else if(this.activatedRoute.snapshot.url[0].path === 'rural'){
      this.spinner.cargarSpinner();
      this.mapa = this.domSanitizer.bypassSecurityTrustHtml(
        '<iframe src="https://www.google.com/maps/d/embed?mid=1kDWrF9x3qWP5C2bt9jHyzDC4dqI0qIc&ehbc=2E312F" width="100%" height="100%" style="border: 0" loading="lazy" allowfullscreen></iframe>'
      );
      this.territoriyDataService.getTerritorieRural().subscribe({
        next: (road: DataRural[]) => {
          this.dataRural = road;
          this.showRural = true;
          this.spinner.cerrarSpinner();
        }
      })
    }
  }

  openModal(mode: ModeModal, form?: DataRural){
    if(this.modalFormRuralComponent){
      if(mode === 'creation'){
        this.modalFormRuralComponent.openModalCreation();
      } else if (mode === 'edition'){
        this.modalFormRuralComponent.openModalEdition(form);
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
