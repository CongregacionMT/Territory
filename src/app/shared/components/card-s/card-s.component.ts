import { Component, OnInit, input } from '@angular/core';

import { TerritoryNumberData } from '@core/models/TerritoryNumberData';

@Component({
    selector: 'app-card-s',
    templateUrl: './card-s.component.html',
    styleUrls: ['./card-s.component.scss']
})
export class CardSComponent implements OnInit {
  readonly terrNumber = input<TerritoryNumberData>();
  constructor() { }
  ngOnInit(): void {}
}
