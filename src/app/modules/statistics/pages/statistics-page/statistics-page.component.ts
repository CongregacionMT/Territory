import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { DatePipe } from '@angular/common';
import { SortBy } from '@core/pipes/sort-by.pipe';
import { environment } from '@environments/environment';

@Component({
    selector: 'app-statistics-page',
    templateUrl: './statistics-page.component.html',
    styleUrls: ['./statistics-page.component.scss'],
    imports: [ReactiveFormsModule, DatePipe, SortBy]
})
export class StatisticsPageComponent implements OnInit{
  private territorieDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private rutaActiva = inject(ActivatedRoute);

  // Variables convertidas a signals
  routerBreadcrum = signal<any>([]);
  loadingData = signal<boolean>(false);
  territoryPath = signal<any>(null);
  territory = signal<TerritoryNumberData[]>([]);
  dataListFull = signal<any[]>([]);
  dataStadistics = signal<any[]>([]);
  appleCount = signal<any>(null);
  path = signal<string>('');
  order = signal<number>(1);
  nameTitleTerritory = signal<string>('');

  // FormControls no necesitan ser signals ya que tienen su propia reactividad
  green: FormControl;
  blue: FormControl;
  yellow: FormControl;
  red: FormControl;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    // Obtener el parámetro de la URL (ej: 'mariaTeresa', 'christophersen', 'rural')
    this.territoryPath.set(this.rutaActiva.snapshot.paramMap.get('locality') || '');
    
    // Buscar el nombre bonito en la configuración si existe
    const localityConfig = environment.localities?.find(l => l.key === this.territoryPath());
    const title = localityConfig ? localityConfig.name : this.capitalize(this.territoryPath());
    
    this.nameTitleTerritory.set(title);
    
    this.green = new FormControl(28);
    this.blue = new FormControl(42);
    this.yellow = new FormControl(56);
    this.red = new FormControl(57);
  }

  ngOnInit(): void {
    // Suscribirse a cambios en los parámetros por si se navega entre localidades
    this.rutaActiva.paramMap.subscribe(params => {
      const locality = params.get('locality');
      if (locality && locality !== this.territoryPath()) {
        this.territoryPath.set(locality);
        const localityConfig = environment.localities?.find(l => l.key === locality);
        this.nameTitleTerritory.set(localityConfig ? localityConfig.name : this.capitalize(locality));
        this.getDataStatisticTerritory();
      }
    });

    this.getDataStatisticTerritory();
  }

  getDataStatisticTerritory() {
    const path = this.territoryPath();
    if (!path) return;

    // Generar key consistente con HomeStatisticsPageComponent
    // ej: mariaTeresa -> statisticDataMariaTeresa
    const suffix = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, '');
    const nameLocalStorage = `statisticData${suffix}`;

    // Fallback para legacy 'urbano'
    let storageKey = nameLocalStorage;
    
    if (path === 'urbano') {
       if (environment.congregationKey === 'wheelwright') {
           storageKey = 'statisticDataW';
       } else {
           // Si es otra congregación (ej: Maria Teresa) y la URL dice 'urbano',
           // asumimos que se refiere a la localidad principal (la primera en la lista)
           const mainLocality = environment.localities?.[0];
           if (mainLocality) {
               const suffix = mainLocality.key.charAt(0).toUpperCase() + mainLocality.key.slice(1).replace(/-/g, '');
               storageKey = `statisticData${suffix}`;
           }
       }
    }

    if (sessionStorage.getItem(storageKey)) {
      const storedStatisticData = sessionStorage.getItem(storageKey);
      this.dataListFull.set(storedStatisticData ? JSON.parse(storedStatisticData) : []);
      this.sortTable("completed");
      this.loadingData.set(true);
      return;
    }
  }

  capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
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
    this.path.set(prop);
    this.order.set(this.order() * (-1));
    return false;
  }

  getIcon(prop:string): string{
    var iconClass = "fa fa-sort";
    if(this.path().indexOf(prop) != -1){
      iconClass = this.order() === -1 ? 'fa fa-sort-down' : 'fa fa-sort-up';
    }
    return iconClass;
  }
}
