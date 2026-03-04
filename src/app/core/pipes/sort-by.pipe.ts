import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'sortBy' })
export class SortBy implements PipeTransform {
  transform<T>(array: Array<T>, args: string, order: number): Array<T> {
    let newArray = [...array];

    newArray.sort((a: any, b: any) => {
      if (args === 'start' || args === 'end') {
        const valA = this.getDateValue(a, args);
        const valB = this.getDateValue(b, args);

        const dateA = valA ? new Date(valA).getTime() : 0;
        const dateB = valB ? new Date(valB).getTime() : 0;

        return dateA - dateB;
      }

      const valueA = a[0] ? a[0][args] : a[args];
      const valueB = b[0] ? b[0][args] : b[args];

      // Si es el número de territorio, forzar comparación numérica
      if (args === 'numberTerritory' || args === 'territory') {
        const numA = parseInt(String(valueA), 10);
        const numB = parseInt(String(valueB), 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
      }

      return this.compareValues(valueA, valueB);
    });

    if (order !== 1) {
      newArray.reverse();
    }

    return newArray;
  }

  private getDateValue(item: any, property: string): string {
    const dates = ['end', 'start'];
    let value = '';

    if (dates.includes(property)) {
      for (let i = 0; i < 6; i++) {
        if (item[i] && item[i][property] && item[i][property] !== '') {
          value = item[i][property];
          break;
        }
      }
    }

    return value;
  }

  private compareValues(valueA: any, valueB: any): number {
    if (valueA < valueB) {
      return -1;
    } else if (valueA > valueB) {
      return 1;
    } else {
      return 0;
    }
  }
}
