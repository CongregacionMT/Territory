import { Component, } from '@angular/core';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '../../../../core/services/spinner.service';

@Component({
  selector: 'app-departure-page',
  templateUrl: './departure-page.component.html',
  styleUrls: ['./departure-page.component.scss']
})
export class DeparturePageComponent {
  departures: any[] = []
  formDeparture: FormGroup;
  constructor(
    private territoryDataService: TerritoryDataService,
    private fb: FormBuilder,
    private spinner: SpinnerService
  ) {
    this.spinner.cargarSpinner();
    this.formDeparture = this.fb.group({
      date: new FormControl(""),
      
    })
  }

  ngOnInit(): void {
    this.territoryDataService.getDepartures().subscribe({
      next: (departure) => {
        this.departures = departure;
        console.log(departure);
        this.spinner.cerrarSpinner();
      }
    })
  }

  submitForm(departure: any){

  }

}
