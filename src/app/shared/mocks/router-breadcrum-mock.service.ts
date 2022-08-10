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
    ]);
  }
}
