import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DeparturesMockService {

  constructor() { }

  getDeparture() {
    return ([
        {
            date: "29 de agosto - 04 de septiembre"
        },
        {
            departure: [
                {
                    day: "Lunes",
                    schedule: "10:00hs",
                    driver: "Cristian",
                    territory: "Zoom",
                    point: ""
                },
                {
                    day: "Lunes",
                    schedule: "17:30hs",
                    driver: "Facundo",
                    territory: "Zoom",
                    point: ""
                },{
                    day: "Martes",
                    schedule: "10:00hs",
                    driver: "Mariano",
                    territory: "Zoom",
                    point: ""
                },{
                    day: "Martes",
                    schedule: "17:30hs",
                    driver: "David",
                    territory: "Zoom",
                    point: ""
                },{
                    day: "Miercoles",
                    schedule: "10:00hs",
                    driver: "Nicolas",
                    territory: "Zoom",
                    point: ""
                },{
                    day: "Miercoles",
                    schedule: "",
                    driver: "Reunión",
                    territory: "",
                    point: ""
                },{
                    day: "Jueves",
                    schedule: "10:00hs",
                    driver: "Mariano",
                    territory: "Zoom",
                    point: ""
                },{
                    day: "Jueves",
                    schedule: "16:30hs",
                    driver: "David",
                    territory: "N°1",
                    point: "Salón del Reino"
                },{
                    day: "Viernes",
                    schedule: "10:00hs",
                    driver: "Miguel",
                    territory: "Zoom",
                    point: ""
                },{
                    day: "Viernes",
                    schedule: "17:30hs",
                    driver: "Nicolas",
                    territory: "Zoom",
                    point: ""
                },{
                    day: "Sábado",
                    schedule: "09:30hs",
                    driver: "Guille",
                    territory: "N°1",
                    point: "Salón del Reino"
                },{
                    day: "Sábado",
                    schedule: "16:00hs",
                    driver: "Miguel",
                    territory: "N°1",
                    point: "Rural"
                },
            ]
        }
    ]);
  }
}
