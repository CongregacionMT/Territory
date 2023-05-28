import { Component, Input, OnInit } from '@angular/core';
import { Departure } from '@core/models/Departures';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-table-departures',
  templateUrl: './table-departures.component.html',
  styleUrls: ['./table-departures.component.scss']
})
export class TableDeparturesComponent implements OnInit {
  @Input() dateDeparture: any;
  @Input() departures: Departure[] = [] as Departure[];
  currentPath: number = 0;
  constructor(private route: ActivatedRoute) { }

  ngOnInit(): void {
    let pathURL = this.route.snapshot.url.pop()?.path || 0;
    this.currentPath = Number(pathURL);
    console.log("data entrante:", this.currentPath);
  }
  getDayOfWeek(dateString: string): string {
    const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const date = new Date(dateString);
    const dayOfWeekIndex = date.getDay();
    return daysOfWeek[dayOfWeekIndex];
  }
}
