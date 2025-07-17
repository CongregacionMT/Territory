import { Component, OnInit, Input } from '@angular/core';

@Component({
    selector: 'app-card-s',
    templateUrl: './card-s.component.html',
    styleUrls: ['./card-s.component.scss'],
    standalone: false
})
export class CardSComponent implements OnInit {
  @Input() terrNumber: any;
  constructor() { }
  ngOnInit(): void {}
}
