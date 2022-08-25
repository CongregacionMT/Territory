import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-mapas',
  templateUrl: './mapas.component.html',
  styleUrls: ['./mapas.component.scss']
})
export class MapasComponent implements OnInit {
  
  mapa: any;
  constructor(private activatedRoute: ActivatedRoute, private domSanitizer: DomSanitizer) { }

  ngOnInit(): void {
    if(this.activatedRoute.snapshot.url[0].path === 'maria-teresa'){
      this.mapa = this.domSanitizer.bypassSecurityTrustHtml(
        '<iframe src="https://www.google.com/maps/d/embed?mid=1H-aEAUqqCeX8rRRNykvly38QZIZJ76s&ehbc=2E312F" width="100%" height="100%" style="border: 0" loading="lazy" allowfullscreen></iframe>'
      )
    } else if (this.activatedRoute.snapshot.url[0].path === 'christophersen'){
      this.mapa = this.domSanitizer.bypassSecurityTrustHtml(
        '<iframe src="https://www.google.com/maps/d/embed?mid=1WYVbLbcT5UJDQawb4ahOIfdCwEfocFY&ehbc=2E312F" width="100%" height="100%" style="border: 0" loading="lazy" allowfullscreen></iframe>'
      )
    }
  }
}
