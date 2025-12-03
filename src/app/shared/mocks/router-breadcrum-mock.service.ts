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
          name: 'Home',
          route: 'Home',
        },
        {
          name: 'Territorios',
          route: 'Territorios',
        },
      ],
      [
        {
          name: 'Home',
          route: 'Home',
        },
        {
          name: 'Salidas',
          route: 'Salidas',
        },
      ],
      [
        {
          name: 'Home',
          route: 'Home',
        },
        {
          name: 'Registro de territorios',
          route: 'Registro de territorios',
        },
      ],
      [
        {
          name: 'Home',
          route: 'Home',
        },
        {
          name: 'Registro de territorios',
          route: 'Registro de territorios',
        },
        {
          name: environment.congregationName,
          route: environment.congregationName,
        }
      ],
      [
        {
          name: 'Home',
          route: 'Home',
        },
        {
          name: 'Registro de territorios',
          route: 'Registro de territorios',
        },
        {
          name: 'Rural',
          route: 'Rural'
        }
      ],
      [
        {
          name: 'Home',
          route: 'Home',
        },
        {
          name: 'Registro de territorios',
          route: 'Registro de territorios',
        },
        {
          name: environment.congregationName,
          route: environment.congregationName
        },
        {
          name: 'Territorio',
          route: 'Territorio'
        }
      ],
      [
        {
          name: 'Home',
          route: 'Home',
        },
        {
          name: 'Registro de territorios',
          route: 'Registro de territorios',
        },
        {
          name: 'Rural',
          route: 'Rural'
        },
        {
          name: 'Territorio',
          route: 'Territorio'
        }
      ],
      [
        {
          name: 'Home',
          route: 'Home',
        },
        {
          name: 'Territorios',
          route: 'Territorios',
        },
        {
          name: 'Territorio',
          route: 'Territorio'
        }
      ],
      [
        {
          name: 'Home',
          route: 'Home',
        },
        {
          name: 'Estadísticas',
          route: 'Estadísticas',
        }
      ],
      [
        {
          name: 'Home',
          route: 'Home',
        },
        {
          name: 'Salidas',
          route: 'Salidas'
        },
        {
          name: 'Grupo',
          route: 'Grupo'
        }
      ],
      [
        {
          name: 'Home',
          route: 'Home',
        },
        {
          name: 'Salidas',
          route: 'Salidas'
        },
        {
          name: 'Lista',
          route: 'Lista'
        }
      ],
      [
        {
          name: 'Home',
          route: 'Home',
        },
        {
          name: 'Carrito',
          route: 'Carrito'
        }
      ],
      [
        {
          name: 'Home',
          route: 'Home',
        },
        {
          name: 'Carrito',
          route: 'Carrito'
        },
        {
          name: 'Editar',
          route: 'Editar'
        }
      ]
    ]);
  }
}
