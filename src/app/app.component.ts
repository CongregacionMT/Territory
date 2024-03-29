import { Component, OnInit } from '@angular/core';
import { SpinnerService } from '@core/services/spinner.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit{
  isLoading$: boolean = false;

  constructor(private spinner: SpinnerService) {}

  ngOnInit(): void{
    this.spinner.getSpinner$().subscribe(spinner => {
      this.isLoading$ = spinner;
    })
  }
}
