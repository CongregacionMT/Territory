import { Component, OnInit, input } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-card-xl',
    templateUrl: './card-xl.component.html',
    styleUrls: ['./card-xl.component.scss']
})
export class CardXlComponent implements OnInit {
  readonly mapSRC = input<SafeHtml | string>();
  readonly mapName = input<string>();
  constructor() { }

  ngOnInit(): void {}

}
