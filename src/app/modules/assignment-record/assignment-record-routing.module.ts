import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AssignmentRecordPageComponent } from './pages/assignment-record-page/assignment-record-page.component';
import { ChristophersenAssignmentComponent } from './pages/christophersen-assignment/christophersen-assignment.component';
import { MariaTeresaAssignmentComponent } from './pages/maria-teresa-assignment/maria-teresa-assignment.component';
import { NumberTerritoryComponent } from './pages/number-territory/number-territory.component';
import { RuralAssignmentComponent } from './pages/rural-assignment/rural-assignment.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: AssignmentRecordPageComponent },
      { path: 'maria-teresa', children: [
        { path: '', component: MariaTeresaAssignmentComponent },
        { path: 'territorio', component: NumberTerritoryComponent },
      ]},
      { path: 'christophersen', component: ChristophersenAssignmentComponent },
      { path: 'rural', component: RuralAssignmentComponent },
      { path: '**', redirectTo: '' },
    ],
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AssignmentRecordRoutingModule { }
