import { Component, OnInit, Input } from '@angular/core';

@Component({
    selector: 'app-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    styleUrls: ['./breadcrumb.component.scss'],
    standalone: false
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
