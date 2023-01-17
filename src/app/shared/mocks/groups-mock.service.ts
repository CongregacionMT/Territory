import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GroupsMockService {

  constructor() { }

  getGroups() {
    return ([
      {
        name: "Grupo 1",
        src: '../../../assets/img/group.png',
        link: 'grupo/1',
      },
      {
        name: "Grupo 2",
        src: '../../../assets/img/group.png',
        link: 'grupo/2',
      }
    ]);
  }
}
