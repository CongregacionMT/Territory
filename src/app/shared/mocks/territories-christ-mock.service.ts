import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TerritoriesChristMockService {

  constructor() { }

  getTerritories() {
    return ([
      {
        collection: "TerritorioC-1",
        territorio: 1,
      },
      {
        collection: "TerritorioC-2",
        territorio: 2
      }
    ]);
  }
}
