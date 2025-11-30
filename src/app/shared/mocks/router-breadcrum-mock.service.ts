import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RouterBreadcrumMockService {
  constructor() {}

  getBreadcrum() {
    return ([
      [
        {
          route: 'Home',
        },
        {
          route: 'Territorios',
        },
      ],
      [
        {
          route: 'Home',
        },
        {
          route: 'Salidas',
        },
      ],
      [
        {
          route: 'Home',
        },
        {
          route: 'Registro de territorios',
        },
      ],
      [
        {
          route: 'Home',
        },
        {
          route: 'Registro de territorios',
        },
        {
          route: environment.congregationName,
        }
      ],
      [
        {
          route: 'Home',
        },
        {
          route: 'Registro de territorios',
        },
        {
          route: 'Rural'
        }
      ],
      [
        {
          route: 'Home',
        },
        {
          route: 'Registro de territorios',
        },
        {
          route: environment.congregationName
        },
        {
          route: 'Territorio'
        }
      ],
      [
        {
          route: 'Home',
        },
        {
          route: 'Registro de territorios',
        },
        {
          route: 'Rural'
        },
        {
          route: 'Territorio'
        }
      ],
      [
        {
          route: 'Home',
        },
        {
          route: 'Territorios',
        },
        {
          route: 'Territorio'
        }
      ],
      [
        {
          route: 'Home',
        },
        {
          route: 'Estadísticas',
        }
      ],
      [
        {
          route: 'Home',
        },
        {
          route: 'Salidas'
        },
        {
          route: 'Grupo'
        }
      ],
      [
        {
          route: 'Home',
        },
        {
          route: 'Salidas'
        },
        {
          route: 'Lista'
        }
      ],
      [
        {
          route: 'Home',
        },
        {
          route: 'Carrito'
        }
      ],
      [
        {
          route: 'Home',
        },
        {
          route: 'Carrito'
        },
        {
          route: 'Editar'
        }
      ]
    ]);
  }
}
