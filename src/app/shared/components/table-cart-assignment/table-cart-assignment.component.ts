import { Component, OnInit, input } from '@angular/core';
import { CartData } from '@core/models/Cart';

@Component({
    selector: 'app-table-cart-assignment',
    templateUrl: './table-cart-assignment.component.html',
    styleUrls: ['./table-cart-assignment.component.scss']
})
export class TableCartAssignmentComponent implements OnInit {
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
      // Si los días son iguales, compara las horas
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

  redirectToMap(link: string): void {
    window.open(link, '_blank');
  }
}
