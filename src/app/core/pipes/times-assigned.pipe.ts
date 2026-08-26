import { Pipe, PipeTransform } from '@angular/core';
import { Card, CardApplesData } from '@core/models/Card';

@Pipe({ name: 'timesAssigned' })
export class TimesAssigned implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(dataList: Card[], _time?: boolean): number {
    let dataFilter = JSON.parse(JSON.stringify(dataList)) as Card[];
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
