import { Component, OnInit, input, ChangeDetectionStrategy } from '@angular/core';
import { CartData } from '@core/models/Cart';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-cart-assignment-cards',
  templateUrl: './cart-assignment-cards.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  styleUrls: ['./cart-assignment-cards.component.scss'],
})
export class CartAssignmentCardsComponent implements OnInit {
  readonly cartData = input<CartData[]>([] as CartData[]);

  ngOnInit(): void {
    this.sortCartData();
  }

  sortCartData(): void {
    const dayOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    this.cartData().sort((a, b) => {
      const isDateA = a.date?.includes('-');
      const isDateB = b.date?.includes('-');

      if (isDateA && isDateB) {
        const dateComparison = a.date.localeCompare(b.date);
        if (dateComparison !== 0) return dateComparison;
      } else if (!isDateA && !isDateB) {
        const dayComparison = dayOrder.indexOf(a.date) - dayOrder.indexOf(b.date);
        if (dayComparison !== 0) return dayComparison;
      } else {
        return isDateA ? -1 : 1;
      }

      return this.compareTimes(a.schedule || '', b.schedule || '');
    });
  }

  compareTimes(timeA: string, timeB: string): number {
    if (!timeA && !timeB) return 0;
    if (!timeA) return 1;
    if (!timeB) return -1;
    const [hoursA, minutesA] = timeA.split(':').map(Number);
    const [hoursB, minutesB] = timeB.split(':').map(Number);
    if (hoursA !== hoursB) {
      return hoursA - hoursB;
    }
    return minutesA - minutesB;
  }

  isToday(dateString: string): boolean {
    if (!dateString) return false;
    const today = new Date();

    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return (
          today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
        );
      }
    }

    const dayOrder = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDayName = dayOrder[today.getDay()];
    return dateString.toLowerCase() === currentDayName.toLowerCase();
  }

  getDayOfWeek(dateString: string): string {
    if (!dateString) return '';
    if (!dateString.includes('-')) return dateString;

    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return days[date.getDay()];
    }
    return dateString;
  }

  getTailwindColor(color: string): { bg: string; border: string; text: string } {
    switch (color) {
      case 'primary':
        return { bg: 'bg-blue-900/30', border: 'border-blue-500', text: 'text-blue-300' };
      case 'success':
        return { bg: 'bg-emerald-900/30', border: 'border-emerald-500', text: 'text-emerald-300' };
      case 'warning':
        return { bg: 'bg-amber-900/30', border: 'border-amber-500', text: 'text-amber-300' };
      case 'danger':
        return { bg: 'bg-red-900/30', border: 'border-red-500', text: 'text-red-300' };
      case 'info':
        return { bg: 'bg-cyan-900/30', border: 'border-cyan-500', text: 'text-cyan-300' };
      case 'secondary':
        return { bg: 'bg-slate-800/80', border: 'border-slate-500', text: 'text-slate-300' };
      default:
        return { bg: 'bg-slate-800', border: 'border-slate-600', text: 'text-slate-200' };
    }
  }
}
