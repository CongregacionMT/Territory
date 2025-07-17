import { Component, Input, OnInit } from '@angular/core';

@Component({
    selector: 'app-card-xl',
    templateUrl: './card-xl.component.html',
    styleUrls: ['./card-xl.component.scss']
})
export class CardXlComponent implements OnInit {
  @Input() mapSRC: any;
  @Input() mapName: any;
  constructor() { }

  ngOnInit(): void {}

}
