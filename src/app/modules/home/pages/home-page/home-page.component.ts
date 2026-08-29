import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { PwaService } from '@core/services/pwa.service';
import { environment } from '@environments/environment';
import { TitleCasePipe } from '@angular/common';
import { HomeFacadeService } from '../../services/home-facade.service';

export interface NavOption {
  label: string;
  route: string;
  iconPath: string;
  requireAdmin?: boolean;
}

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TitleCasePipe],
})
export class HomePageComponent implements OnInit {
  public readonly authService = inject(AuthService);
  public readonly pwaService = inject(PwaService);
  private readonly homeFacade = inject(HomeFacadeService);

  congregationName: string = environment.congregationName;

  navOptions = signal<NavOption[]>([
    { label: 'Territorios', route: '../territorios', iconPath: 'assets/img/map.png' },
    { label: 'Salidas', route: '../salidas', iconPath: 'assets/img/salidas.png' },
    { label: 'Carrito', route: '../carrito', iconPath: 'assets/img/carrito.png' },
    {
      label: 'Campaña',
      route: '../campaign',
      iconPath: 'assets/img/campaign.png',
      requireAdmin: true,
    },
    {
      label: 'Estadísticas',
      route: '../statistics',
      iconPath: 'assets/img/statistics.png',
      requireAdmin: true,
    },
    {
      label: 'Registro de territorios',
      route: '../registro-territorios',
      iconPath: 'assets/img/asignacion.png',
      requireAdmin: true,
    },
    {
      label: 'Usuarios',
      route: '../usuarios',
      iconPath: 'assets/img/group.png',
      requireAdmin: true,
    },
  ]);

  ngOnInit(): void {
    this.homeFacade.initializeHomeState();
  }

  activeNotification(): void {
    this.homeFacade.enableNotifications();
  }
}
