import { Component, OnInit, inject } from '@angular/core';
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
  private spinner = inject(SpinnerService);
  private messagingService = inject(MessagingService);

  isLoading$: boolean = false;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

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
