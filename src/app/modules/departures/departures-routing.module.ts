import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DeparturePageComponent } from './pages/departure-page/departure-page.component';
import { GroupPageComponent } from './pages/group-page/group-page.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: DeparturePageComponent },
      { path: 'grupo/:number', component: GroupPageComponent },
      { path: '**', redirectTo: '' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DeparturesRoutingModule { }
