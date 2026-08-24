import { Pipe, PipeTransform } from '@angular/core';
import { Card, CardApplesData } from '@core/models/Card';

@Pipe({ name: 'timesAssigned' })
export class TimesAssigned implements PipeTransform {
  dataFilter: any;
  appleCount: any;
  dias: any;
  transform(dataList: Card[], time: boolean): number {
    this.dataFilter = JSON.parse(JSON.stringify(dataList)) as Card[];
    if (this.dataFilter.length !== 0) {
      this.dataFilter = this.dataFilter.filter((list: Card) => {
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
      // Calculo de fechas
      // console.log("fecha: ", this.dataFilter);
    }

    return this.dataFilter.length;
  }
}
