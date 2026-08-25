import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'sortBy' })
export class SortBy implements PipeTransform {
  transform<T>(array: Array<T>, args: string, order: number): Array<T> {
    const newArray = [...array];

    newArray.sort((a: T, b: T) => {
      if (args === 'start' || args === 'end') {
        const valA = this.getDateValue(a, args);
        const valB = this.getDateValue(b, args);

        const dateA = valA ? new Date(valA).getTime() : 0;
        const dateB = valB ? new Date(valB).getTime() : 0;

        return dateA - dateB;
      }

      const objA = a as Record<string | number, unknown>;
      const objB = b as Record<string | number, unknown>;

      const valueA = objA[0] ? (objA[0] as Record<string, unknown>)[args] : objA[args];
      const valueB = objB[0] ? (objB[0] as Record<string, unknown>)[args] : objB[args];

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

  private getDateValue(item: unknown, property: string): string {
    const dates = ['end', 'start'];
    let value = '';

    if (dates.includes(property)) {
      for (let i = 0; i < 6; i++) {
        const arrItem = item as Record<number, Record<string, string>>;
        if (arrItem[i] && arrItem[i][property] && arrItem[i][property] !== '') {
          value = arrItem[i][property];
          break;
        }
      }
    }

    return value;
  }

  private compareValues(valueA: unknown, valueB: unknown): number {
    const valA = valueA as string | number;
    const valB = valueB as string | number;
    if (valA < valB) {
      return -1;
    } else if ((valueA as number) > (valueB as number)) {
      return 1;
    } else {
      return 0;
    }
  }
}
