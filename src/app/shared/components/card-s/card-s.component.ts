import { Component, OnInit, input } from '@angular/core';

@Component({
    selector: 'app-card-s',
    templateUrl: './card-s.component.html',
    styleUrls: ['./card-s.component.scss']
})
export class CardSComponent implements OnInit {
  readonly terrNumber = input<any>();
  constructor() { }
  ngOnInit(): void {}
}
