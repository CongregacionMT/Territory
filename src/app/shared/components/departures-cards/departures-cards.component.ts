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

  addToCalendar(departure: Departure): void {
    // Parse date and time
    // departure.date format: YYYY-MM-DD
    // departure.schedule format: HH:mm
    const datePart = departure.date;
    const timePart = departure.schedule;
    
    const startDateTime = new Date(`${datePart}T${timePart}:00`);
    const endDateTime = new Date(startDateTime.getTime() + (2 * 60 * 60 * 1000)); // Default 2 hours duration

    // Format for Google Calendar: YYYYMMDDTHHmmss
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const start = formatDate(startDateTime);
    const end = formatDate(endDateTime);

    // Include location in title for better context
    const title = encodeURIComponent(`Salida a predicar - ${departure.point}`);
    
    // Build description with Maps link prominently displayed
    let descriptionText = `📍 Punto de encuentro: ${departure.point}`;
    if (departure.maps) {
      descriptionText += `\n🗺️ Ver ubicación: ${departure.maps}`;
    }
    descriptionText += `\n\n👤 Conductor: ${departure.driver}`;
    descriptionText += `\n📋 Territorios: ${departure.territory.join(', ')}`;
    
    const details = encodeURIComponent(descriptionText);
    
    // Use point name as location (Google Calendar works better with text addresses)
    const location = encodeURIComponent(departure.point);

    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}&sf=true&output=xml`;

    window.open(googleCalendarUrl, '_blank');
  }
}
