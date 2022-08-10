import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TerritoriesChristMockService {

  constructor() { }

  getTerritories() {
    return ([
      {
        territorio: 1,
      },
      {
        territorio: 2
      }
    ]);
  }
}
