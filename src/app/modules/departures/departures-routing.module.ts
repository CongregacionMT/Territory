import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeDeparturePageComponent } from './pages/home-departure-page/home-departure-page.component';
import { DeparturePageComponent } from './pages/departure-page/departure-page.component';
import { TablePublishersPageComponent } from './pages/table-publishers-page/table-publishers-page.component';
import { EditDeparturesComponent } from './pages/edit-departures/edit-departures.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: HomeDeparturePageComponent },
      { path: 'editar', component: EditDeparturesComponent },
      { path: 'grupo/:number', component: DeparturePageComponent },
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
