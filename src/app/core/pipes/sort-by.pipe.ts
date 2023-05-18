import { Pipe, PipeTransform } from '@angular/core';
import { orderBy } from 'lodash';

@Pipe({ name: 'sortBy' })
export class SortBy implements PipeTransform {
  transform(array: Array<any>, args: string, order: number): Array<any> {
    console.log("old", array);
    let newArray = array.sort((a: any, b: any) => {
      // if(a[0][args].includes('-')){
      //   console.log("fecha");
      //   if(new Date(a[0][args]).getDate() < new Date(b[0][args]).getDate()){
      //     return -1
      //   } else if(new Date(a[0][args]).getDate() > new Date(b[0][args]).getDate()){
      //     return 1
      //   } else {
      //     return 0
      //   }
      // }
      if (a[0][args] < b[0][args]) {
        console.log("negativo", a[0][args]);
        return -1;
      } else if (a[0][args] > b[0][args]) {
        console.log("positivo", a[0][args]);
        return 1;
      } else {
        console.log("neutro", typeof a[0][args]);
        return 0;
      }
    });
    if(order !== 1){
      newArray.reverse();
    }
    return newArray;
  }
}
