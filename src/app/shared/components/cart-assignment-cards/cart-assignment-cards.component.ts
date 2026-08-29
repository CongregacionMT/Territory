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
      const dayComparison = dayOrder.indexOf(a.date) - dayOrder.indexOf(b.date);
      if (dayComparison !== 0) {
        return dayComparison;
      }
      return this.compareTimes(a.schedule, b.schedule);
    });
  }

  compareTimes(timeA: string, timeB: string): number {
    const [hoursA, minutesA] = timeA.split(':').map(Number);
    const [hoursB, minutesB] = timeB.split(':').map(Number);
    if (hoursA !== hoursB) {
      return hoursA - hoursB;
    }
    return minutesA - minutesB;
  }

  isToday(dayName: string): boolean {
    const today = new Date();
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    const dayOrder = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDayName = dayOrder[today.getDay()];
    return dayName.toLowerCase() === currentDayName.toLowerCase();
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
