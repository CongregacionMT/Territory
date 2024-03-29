import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AssignmentRecordPageComponent } from './pages/assignment-record-page/assignment-record-page.component';
import { NumberTerritoryComponent } from './pages/number-territory/number-territory.component';
import { TerritoryAssignmentComponent } from './pages/territory-assignment/territory-assignment.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: AssignmentRecordPageComponent },
      {
        path: 'mariaTeresa', component: TerritoryAssignmentComponent
      },
      {
        path: 'mariaTeresa/:collection', component: NumberTerritoryComponent
      },
      {
        path: 'christophersen', component: TerritoryAssignmentComponent
      },
      {
        path: 'christophersen/:collection', component: NumberTerritoryComponent
      },
    ],
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AssignmentRecordRoutingModule { }
