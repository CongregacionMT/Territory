import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DataNumberTerritoryService {
  constructor() {}

  getDataListMT1() {
    return [
      {
        driver: 'David',
        start: '08/08/2022',
        ending: '10/08/2022',
        apples: [
          {
            name: 'Manzana 1',
            checked: true,
          },
          {
            name: 'Manzana 2',
            checked: false,
          },
        ],
        comments:
          'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Veritatis dolores'
      },
      {
        driver: 'Miguel',
        start: '12/08/2022',
        ending: '14/08/2022',
        apples: [
          {
            name: 'Manzana 1',
            checked: false,
          },
          {
            name: 'Manzana 2',
            checked: true,
          },
        ],
        comments: 'Ea, tenetur! Doloremque eaque sed incidunt corporis odio.',
      },
    ];
  }
}
