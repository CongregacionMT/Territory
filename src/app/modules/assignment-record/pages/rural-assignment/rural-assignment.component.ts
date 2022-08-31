import { Component, OnInit } from '@angular/core';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';

@Component({
  selector: 'app-rural-assignment',
  templateUrl: './rural-assignment.component.html',
  styleUrls: ['./rural-assignment.component.scss']
})
export class RuralAssignmentComponent implements OnInit {
  routerBreadcrum: any = []
  constructor(private routerBreadcrumMockService: RouterBreadcrumMockService) { 
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum()
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[5]
  }

}
