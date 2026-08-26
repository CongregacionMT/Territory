import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '@environments/environment';
import { CircuitOverseerService } from '../../services/circuit-overseer.service';
import { AuthService } from '@core/services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';

interface DashboardCard {
  title: string;
  imgUrl: string;
  route: string;
  hoverColor: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  congregationName = environment.congregationName;
  private circuitOverseerService = inject(CircuitOverseerService);
  private authService = inject(AuthService);

  overseer = toSignal(this.circuitOverseerService.getOverseerData(), {
    initialValue: { name: 'Esteban y Natalia' },
  });
  isAdmin = this.authService.isAdmin;

  newName = signal('');

  cards = signal<DashboardCard[]>([
    {
      title: 'Ubicaciones',
      imgUrl: 'https://i.postimg.cc/5XbRCwC8/mt.png',
      route: '../territorios/ubications-overseer',
      hoverColor: 'hover:shadow-sky-500/20',
    },
    {
      title: 'Territorios',
      imgUrl: 'assets/img/map.png',
      route: '../territorios',
      hoverColor: 'hover:shadow-emerald-500/20',
    },
    {
      title: 'Salidas',
      imgUrl: 'assets/img/salidas.png',
      route: '../salidas',
      hoverColor: 'hover:shadow-amber-500/20',
    },
  ]);

  saveName(): void {
    const name = this.newName().trim();
    if (name) {
      void this.circuitOverseerService.updateOverseerName(name);
      this.newName.set('');
    }
  }
}
