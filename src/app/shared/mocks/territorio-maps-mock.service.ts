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
        link: '',
      },
      {
        name: 'Christophersen',
        src: 'https://i.postimg.cc/KRXVZXcq/christ.png',
        link: '',
      },
      {
        name: 'Rural',
        src: 'https://i.postimg.cc/bsQ5r6sz/rural.png',
        link: '',
      },
    ]);
  }
}
