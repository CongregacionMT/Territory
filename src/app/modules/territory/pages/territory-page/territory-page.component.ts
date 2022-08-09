import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-territory-page',
  templateUrl: './territory-page.component.html',
  styleUrls: ['./territory-page.component.scss']
})
export class TerritoryPageComponent implements OnInit {
  routerBreadcrum: any[] = [
    {
      route: "Home"
    },
    {
      route: "Territorios"
    }
  ]
  territorioMaps: any[] = [
    {
      name: "Maria Teresa",
      src: "https://i.postimg.cc/5XbRCwC8/mt.png",
      link: ""
    },
    {
      name: "Christophersen",
      src: "https://i.postimg.cc/KRXVZXcq/christ.png",
      link: ""
    },
    {
      name: "Rural",
      src: "https://i.postimg.cc/bsQ5r6sz/rural.png",
      link: ""
    }
  ]
  territoriesMT: any[] = [
    {
      territorio: 1,
    },
    {
      territorio: 2
    },
    {
      territorio: 3
    },
    {
      territorio: 4
    },
    {
      territorio: 5
    },
    {
      territorio: 6
    },
    {
      territorio: 7
    },
    {
      territorio: 8
    },
    {
      territorio: 9
    },
    {
      territorio: 10
    },
    {
      territorio: 11
    },
    {
      territorio: 12
    },
    {
      territorio: 13
    },
    {
      territorio: 14
    },
    {
      territorio: 17
    }
  ];
  territoriesC: any[] = [
    {
      territorio: 1,
    },
    {
      territorio: 2
    }
  ];

  constructor() { }

  ngOnInit(): void {
  }

}
