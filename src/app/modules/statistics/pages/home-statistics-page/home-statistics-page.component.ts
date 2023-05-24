import { Component, OnInit } from '@angular/core';
import { CardButtonsData } from '@core/models/CardButtonsData';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';

@Component({
  selector: 'app-home-statistics-page',
  templateUrl: './home-statistics-page.component.html',
  styleUrls: ['./home-statistics-page.component.scss']
})
export class HomeStatisticsPageComponent implements OnInit{
  routerBreadcrum: any = [];
  CardButtonsStatistics: CardButtonsData[] = [];
  constructor(
    private territorieDataService: TerritoryDataService,
    private spinner: SpinnerService,
  ) {}
  ngOnInit(): void {
    this.spinner.cargarSpinner();
    this.territorieDataService.getStatisticsButtons()
    .subscribe(number => {
      console.log(number[0].territorio);
      this.CardButtonsStatistics = number[0].territorio;
      this.spinner.cerrarSpinner();
    });
  }
}
