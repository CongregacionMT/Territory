import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'sortBy',
    standalone: false
})
export class SortBy implements PipeTransform {
  transform(array: Array<any>, args: string, order: number): Array<any> {
    let newArray = [...array];

    newArray.sort((a: any, b: any) => {
      if (args === 'start' || args === 'end') {
        const dateA = new Date(this.getDateValue(a, args));
        const dateB = new Date(this.getDateValue(b, args));
        return dateA.getTime() - dateB.getTime();
      }

      return this.compareValues(a[0][args], b[0][args]);
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
        if (item[i]?.[property] !== '') {
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
