import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { DataRural } from '@core/models/DataRural';
import { TerritoryDataService } from '../../../../core/services/territory-data.service';

@Component({
  selector: 'app-mapas',
  templateUrl: './mapas.component.html',
  styleUrls: ['./mapas.component.scss']
})
export class MapasComponent implements OnInit {

  mapa: any;
  class: string = 'map-responsive'
  soon: boolean = false;
  dataRural: DataRural[] = [];
  constructor(private activatedRoute: ActivatedRoute, private domSanitizer: DomSanitizer, private territoriyDataService: TerritoryDataService) { }

  ngOnInit(): void {
    if(this.activatedRoute.snapshot.url[0].path === 'maria-teresa'){
      this.mapa = this.domSanitizer.bypassSecurityTrustHtml(
        '<iframe src="https://www.google.com/maps/d/embed?mid=1H-aEAUqqCeX8rRRNykvly38QZIZJ76s&ehbc=2E312F" width="100%" height="100%" style="border: 0" loading="lazy" allowfullscreen></iframe>'
      )
    } else if (this.activatedRoute.snapshot.url[0].path === 'christophersen'){
      this.mapa = this.domSanitizer.bypassSecurityTrustHtml(
        '<iframe src="https://www.google.com/maps/d/embed?mid=1WYVbLbcT5UJDQawb4ahOIfdCwEfocFY&ehbc=2E312F" width="100%" height="100%" style="border: 0" loading="lazy" allowfullscreen></iframe>'
      )
    } else if(this.activatedRoute.snapshot.url[0].path === 'rural'){
      this.mapa = this.domSanitizer.bypassSecurityTrustHtml(
        '<iframe src="https://www.google.com/maps/d/embed?mid=1kDWrF9x3qWP5C2bt9jHyzDC4dqI0qIc&ehbc=2E312F" width="100%" height="100%" style="border: 0" loading="lazy" allowfullscreen></iframe>'
      );
      this.territoriyDataService.getTerritorieRural().subscribe({
        next: (road: DataRural[]) => {
          this.dataRural = road;
        }
      })
    } else {
      this.soon = true;
    }
  }
}
