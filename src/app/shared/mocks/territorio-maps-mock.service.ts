import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TerritorioMapsMockService {

  constructor() { }

  getMaps() {
    return ([
      {
        name: 'Maria Teresa',
        src: 'https://i.postimg.cc/5XbRCwC8/mt.png',
        link: 'maria-teresa',
      },
      {
        name: 'Christophersen',
        src: 'https://i.postimg.cc/KRXVZXcq/christ.png',
        link: 'christophersen',
      },
      {
        name: 'Rural',
        src: 'https://i.postimg.cc/bsQ5r6sz/rural.png',
        link: 'rural',
      },
    ]);
  }
}
