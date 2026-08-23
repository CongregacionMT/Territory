import { Component, OnInit, inject, input, effect, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { Departure } from '@core/models/Departures';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-departures-cards',
  templateUrl: './departures-cards.component.html',
  styleUrls: ['./departures-cards.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgClass],
})
export class DeparturesCardsComponent implements OnInit {
  private route = inject(ActivatedRoute);

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
    const lastPath =
      this.route.snapshot.url[this.route.snapshot.url.length - 1]?.path;
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
    const daysOfWeek = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];
    const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone shifts
    const dayOfWeekIndex = date.getDay();
    return daysOfWeek[dayOfWeekIndex];
  }

  isToday(dateString: string): boolean {
    const today = new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return (
      today.getFullYear() === year &&
      today.getMonth() === month - 1 &&
      today.getDate() === day
    );
  }

  addToCalendar(departure: Departure): void {
    // Parse date and time
    // departure.date format: YYYY-MM-DD
    // departure.schedule format: HH:mm
    const datePart = departure.date;
    const timePart = departure.schedule;

    const startDateTime = new Date(`${datePart}T${timePart}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours duration

    // Format for Google Calendar: YYYYMMDDTHHmmss
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const start = formatDate(startDateTime);
    const end = formatDate(endDateTime);

    // Include location in title for better context
    const eventName = departure.isEvent ? departure.title : 'Salida a predicar';
    const title = encodeURIComponent(`${eventName} - ${departure.point}`);

    // Build description with Maps link prominently displayed
    let descriptionText = `📍 Lugar: ${departure.point}`;
    if (departure.maps) {
      descriptionText += `\n🗺️ Ver ubicación: ${departure.maps}`;
    }
    
    if (!departure.isEvent) {
      descriptionText += `\n\n👤 Conductor: ${departure.driver}`;
      descriptionText += `\n📋 Territorios: ${departure.territory?.join(', ') || ''}`;
    }

    const details = encodeURIComponent(descriptionText);

    // Use point name as location (Google Calendar works better with text addresses)
    const location = encodeURIComponent(departure.point);

    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}&sf=true&output=xml`;

    window.open(googleCalendarUrl, '_blank');
  }

  getNormalizedLocation(location: string): string {
    const locality = environment.localities.find((l) => l.key === location);
    return locality ? locality.territoryPrefix : location;
  }

  getTerritoryRoute(departure: Departure, territory: string): string {
    return (
      '../../../territorios/' +
      this.getNormalizedLocation(departure.location) +
      '-' +
      territory.replace(/\D/g, '')
    );
  }

  getTailwindColor(color: string): { bg: string; border: string; text: string } {
    switch (color) {
      case 'primary': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' };
      case 'success': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' };
      case 'warning': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' };
      case 'danger': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' };
      case 'info': return { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-800' };
      case 'secondary': return { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-800' };
      default: return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800' };
    }
  }
}
