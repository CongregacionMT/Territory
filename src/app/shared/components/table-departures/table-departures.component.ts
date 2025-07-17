import { Component, Input, OnInit, inject } from '@angular/core';
import { Departure } from '@core/models/Departures';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
    selector: 'app-table-departures',
    templateUrl: './table-departures.component.html',
    styleUrls: ['./table-departures.component.scss'],
    imports: [RouterLink]
})
export class TableDeparturesComponent implements OnInit {
  private route = inject(ActivatedRoute);

  @Input() dateDeparture: any;
  @Input() departures: Departure[] = [] as Departure[];
  currentPath: number = 0;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() { }

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
