import { Component, OnInit } from '@angular/core';
import { MessagingService } from '@core/services/messaging.service';
import { SpinnerService } from '@core/services/spinner.service';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    imports: [RouterOutlet]
})
export class AppComponent implements OnInit{
  isLoading$: boolean = false;

  constructor(
    private spinner: SpinnerService,
    private messagingService:MessagingService,
  ) {}

  ngOnInit(): void{
    this.spinner.getSpinner$().subscribe(spinner => {
      this.isLoading$ = spinner;
    })
    this.messagingService.requestPermission()
      .then((token) => {
        console.log("Token recibido: ", token);
      })
      .catch((error) => {
        console.error('Error al solicitar token: ', error);
      })
    this.messagingService.receiveMessages();
  }
}
