import { Component, OnInit } from '@angular/core';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';

@Component({
  selector: 'app-christophersen-assignment',
  templateUrl: './christophersen-assignment.component.html',
  styleUrls: ['./christophersen-assignment.component.scss']
})
export class ChristophersenAssignmentComponent implements OnInit {
  routerBreadcrum: any = []
  constructor(private routerBreadcrumMockService: RouterBreadcrumMockService) { 
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum()
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[4]
  }

}
