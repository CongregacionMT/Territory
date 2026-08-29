import { Pipe, PipeTransform } from '@angular/core';
import { Card, CardApplesData } from '@core/models/Card';

@Pipe({ name: 'timesAssigned' })
export class TimesAssigned implements PipeTransform {
  transform(dataList: Card[]): number {
    let dataFilter = structuredClone(dataList);
    if (dataFilter.length !== 0) {
      dataFilter = dataFilter.filter((list: Card) => {
        let count = 0;
        if (list.applesData) {
          list.applesData.forEach((apple: CardApplesData) => {
            if (apple.checked === true) {
              count += 1;
            }
          });
        }
        return count > 0;
      });
    }

    return dataFilter.length;
  }
}
