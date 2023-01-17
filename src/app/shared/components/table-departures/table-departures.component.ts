import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-table-departures',
  templateUrl: './table-departures.component.html',
  styleUrls: ['./table-departures.component.scss']
})
export class TableDeparturesComponent implements OnInit {
  @Input() dateDeparture: any;
  @Input() departures: any;
  constructor() { }

  ngOnInit(): void {
  }

}
