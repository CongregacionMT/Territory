import { Injectable } from '@angular/core';

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
          route: 'Maria Teresa'
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
          route: 'Christophersen'
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
          route: 'Maria Teresa'
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
          route: 'Christophersen'
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
    ]);
  }
}
