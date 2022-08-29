import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TerritoriesMTMockService {

  constructor() { }

  getTerritories() {
    return ([
      {
        collection: "TerritorioMT-1",
        territorio: 1,
      },
      {
        collection: "TerritorioMT-2",
        territorio: 2
      },
      {
        collection: "TerritorioMT-3",
        territorio: 3
      },
      {
        collection: "TerritorioMT-4",
        territorio: 4
      },
      {
        collection: "TerritorioMT-5",
        territorio: 5
      },
      {
        collection: "TerritorioMT-6",
        territorio: 6
      },
      {
        collection: "TerritorioMT-7",
        territorio: 7
      },
      {
        collection: "TerritorioMT-8",
        territorio: 8
      },
      {
        collection: "TerritorioMT-9",
        territorio: 9
      },
      {
        collection: "TerritorioMT-10",
        territorio: 10
      },
      {
        collection: "TerritorioMT-11",
        territorio: 11
      },
      {
        collection: "TerritorioMT-12",
        territorio: 12
      },
      {
        collection: "TerritorioMT-13",
        territorio: 13
      },
      {
        collection: "TerritorioMT-14",
        territorio: 14
      },
      {
        collection: "TerritorioMT-15",
        territorio: 15
      },
      {
        collection: "TerritorioMT-16",
        territorio: 16
      },
      {
        collection: "TerritorioMT-17",
        territorio: 17
      }
    ]);
  }
}
