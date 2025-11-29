import { Component, OnInit, inject, input } from '@angular/core';
import { Departure } from '@core/models/Departures';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
    selector: 'app-departures-cards',
    templateUrl: './departures-cards.component.html',
    styleUrls: ['./departures-cards.component.scss'],
    imports: [RouterLink]
})
export class DeparturesCardsComponent implements OnInit {
  private route = inject(ActivatedRoute);

  readonly dateDeparture = input<any>();
  readonly departures = input<Departure[]>([] as Departure[]);
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
