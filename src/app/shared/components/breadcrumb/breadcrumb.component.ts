import { Component, OnInit, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    styleUrls: ['./breadcrumb.component.scss'],
    imports: [RouterLink]
})
export class BreadcrumbComponent implements OnInit {
  @Input() routerBreadcrum: any;
  returnBack: string = "../";
  ultimateElement: string = "";
  constructor() {}

  ngOnInit(): void {
    
    this.ultimateElement = this.routerBreadcrum[this.routerBreadcrum.length - 1].route;
    this.routerBreadcrum.pop()
    
  }

}
