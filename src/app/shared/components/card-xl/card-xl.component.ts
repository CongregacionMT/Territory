import { Component, OnInit, input } from '@angular/core';

@Component({
    selector: 'app-card-xl',
    templateUrl: './card-xl.component.html',
    styleUrls: ['./card-xl.component.scss']
})
export class CardXlComponent implements OnInit {
  readonly mapSRC = input<any>();
  readonly mapName = input<any>();
  constructor() { }

  ngOnInit(): void {}

}
