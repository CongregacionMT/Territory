import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '@environments/environment';
import { CircuitOverseerService } from '../../services/circuit-overseer.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, AsyncPipe, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  congregationName = environment.congregationName;
  private circuitOverseerService = inject(CircuitOverseerService);

  overseerData$ = this.circuitOverseerService.getOverseerData();
  isAdmin = localStorage.getItem('tokenAdmin') ? true : false;
  newName = '';

  saveName() {
    if (this.newName.trim()) {
      this.circuitOverseerService.updateOverseerName(this.newName);
      this.newName = '';
    }
  }
}
