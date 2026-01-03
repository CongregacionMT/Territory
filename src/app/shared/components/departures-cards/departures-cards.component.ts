import { Component, OnInit, inject, input, effect } from '@angular/core';
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

  readonly dateDeparture = input<string>();
  readonly departures = input<Departure[]>([] as Departure[]);
  currentPath: number = 0;
  private hasScrolled: boolean = false;

  constructor() {
    effect(() => {
      const deps = this.departures();
      if (deps.length > 0 && !this.hasScrolled) {
        // Scroll to today's departure after a short delay to ensure rendering
        setTimeout(() => {
          if (this.scrollToToday()) {
            this.hasScrolled = true;
          }
        }, 600);
      }
    });
  }

  ngOnInit(): void {
    const lastPath = this.route.snapshot.url[this.route.snapshot.url.length - 1]?.path;
    const parsedPath = Number(lastPath);
    this.currentPath = !isNaN(parsedPath) ? parsedPath : 0;
  }

  private scrollToToday(): boolean {
    const todayElement = document.querySelector('.departure-card.is-today');
    if (todayElement) {
      todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    }
    return false;
  }
  getDayOfWeek(dateString: string): string {
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone shifts
    const dayOfWeekIndex = date.getDay();
    return daysOfWeek[dayOfWeekIndex];
  }

  isToday(dateString: string): boolean {
    const today = new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return today.getFullYear() === year &&
           today.getMonth() === (month - 1) &&
           today.getDate() === day;
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
