import { Component, input, ChangeDetectionStrategy } from '@angular/core';

import { TerritoryNumberData } from '@core/models/TerritoryNumberData';

@Component({
  selector: 'app-card-s',
  templateUrl: './card-s.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./card-s.component.scss'],
})
export class CardSComponent {
  readonly terrNumber = input<TerritoryNumberData>();
}
