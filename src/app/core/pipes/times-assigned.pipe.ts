import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timesAssigned'
})
export class TimesAssigned implements PipeTransform {
  dataFilter: any;
  appleCount: any;
  dias: any;
  transform(dataList: any, time: boolean): any {
    this.dataFilter = JSON.parse(JSON.stringify(dataList))
    if(this.dataFilter.length !== 0){
      // Eliminar listas base (vacias)
      this.dataFilter.map((list: any, index: any) => {
        this.appleCount = 0;
        list.applesData.map((apple: any) => {
          if(apple.checked === true){
            this.appleCount+=1
          }
        });
        if(this.appleCount === 0){
          this.dataFilter.splice(index, 1);
        }
      });
      // Calculo de fechas
      console.log("fecha: ", this.dataFilter);
      
    }
    
    return this.dataFilter.length;
  }

}
