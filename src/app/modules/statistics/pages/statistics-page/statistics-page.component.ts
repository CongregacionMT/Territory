import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';

@Component({
    selector: 'app-statistics-page',
    templateUrl: './statistics-page.component.html',
    styleUrls: ['./statistics-page.component.scss'],
    standalone: false
})
export class StatisticsPageComponent implements OnInit{
  routerBreadcrum: any = [];
  loadingData: boolean = false;
  territoryPath: any;
  territory: TerritoryNumberData[] = [];
  dataListFull: any[] = [];
  dataStadistics: any[] = [];
  appleCount: any;
  path: any = '';
  order: any = 1;
  nameTitleTerritory: string = '';
  green: FormControl;
  blue: FormControl;
  yellow: FormControl;
  red: FormControl;
  constructor(
    private territorieDataService: TerritoryDataService,
    private spinner: SpinnerService,
    private rutaActiva: ActivatedRoute,
  ) {
    this.territoryPath = this.rutaActiva.snapshot.url.join('/');;
    this.nameTitleTerritory = this.territoryPath === "mariaTeresa" ? "María Teresa" : "Christophersen";
    this.loadingData = false;
    this.green = new FormControl(28);
    this.blue = new FormControl(42);
    this.yellow = new FormControl(56);
    this.red = new FormControl(57);
  }

  ngOnInit(): void {
    this.getDataStatisticTerritory();
  }
  getDataStatisticTerritory() {
    const nameLocalStorage = this.territoryPath === "mariaTeresa" ? "statisticDataMT" : "statisticDataCH";
    if (sessionStorage.getItem(nameLocalStorage)) {
      const storedStatisticData = sessionStorage.getItem(nameLocalStorage);
      this.dataListFull = storedStatisticData ? JSON.parse(storedStatisticData) : [];
      this.sortTable("completed");
      this.loadingData = true;
      return;
    }
  }

  paintRow(dataList: any){
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateToday = new Date(`${year}-${month}-${day}`);
    const dateCard = new Date(dataList[0]?.end !== ""
    ? dataList[0]?.end
    : dataList[1]?.end !== ""
    ? dataList[1]?.end
    : dataList[2]?.end !== ""
    ? dataList[2]?.end
    : dataList[3]?.end !== ""
    ? dataList[3]?.end
    : dataList[4]?.end !== ""
    ? dataList[4]?.end
    : dataList[5]?.end);

    const difference = Math.abs(dateCard.getTime() - dateToday.getTime());
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));

    if(days < this.green.value){
      // Menos de 28 dias
      return 'success'
    } else if(days < this.blue.value){
      // Menos de 42 dias
      return 'primary'
    } else if(days < this.yellow.value){
      // Menos de 56
      return 'warning'
    }  else if(days < this.red.value){
      // Más de 56 días
      return 'danger'
    } else {
      return 'danger'
    }
  }
  sortTable(prop: string) {
    this.path = prop;
    this.order = this.order * (-1);
    return false;
  }
  getIcon(prop:string): string{
    var iconClass = "fa fa-sort";
    if(this.path.indexOf(prop) != -1){
      iconClass = this.order===-1 ? 'fa fa-sort-down' : 'fa fa-sort-up';
    }
    return iconClass;
  }
}
