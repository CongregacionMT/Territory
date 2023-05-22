import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DeparturePageComponent } from './pages/departure-page/departure-page.component';
import { GroupPageComponent } from './pages/group-page/group-page.component';
import { TablePublishersPageComponent } from './pages/table-publishers-page/table-publishers-page.component';
import { EditDeparturesComponent } from './pages/edit-departures/edit-departures.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: DeparturePageComponent },
      { path: 'editar', component: EditDeparturesComponent },
      { path: 'grupo/:number', component: GroupPageComponent },
      { path: 'publicadores', component: TablePublishersPageComponent },
      { path: '**', redirectTo: '' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DeparturesRoutingModule { }
