import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AssignmentRecordPageComponent } from './pages/assignment-record-page/assignment-record-page.component';
import { NumberTerritoryComponent } from './pages/number-territory/number-territory.component';
import { TerritoryAssignmentComponent } from './pages/territory-assignment/territory-assignment.component';

export const ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', component: AssignmentRecordPageComponent },
      { path: 'urbano', component: TerritoryAssignmentComponent, data: { breadcrumb: 'Urbano' } },
      { path: 'wheelwright', component: TerritoryAssignmentComponent, data: { breadcrumb: 'Wheelwright' } },
      { path: 'hughes', component: TerritoryAssignmentComponent, data: { breadcrumb: 'Hughes' } },
      { path: 'labordeboy', component: TerritoryAssignmentComponent, data: { breadcrumb: 'Labordeboy' } },
      { path: 'villa-estela', component: TerritoryAssignmentComponent, data: { breadcrumb: 'Villa Estela' } },
      { path: 'arias', component: TerritoryAssignmentComponent, data: { breadcrumb: 'Arias' } },
      { path: 'mariaTeresa', component: TerritoryAssignmentComponent, data: { breadcrumb: 'Maria Teresa' } },
      { path: 'christophersen', component: TerritoryAssignmentComponent, data: { breadcrumb: 'Christophersen' } },
      { path: 'rural', component: TerritoryAssignmentComponent, data: { breadcrumb: 'Rural' } },
      { path: 'urbano/:collection', component: NumberTerritoryComponent, data: { breadcrumb: 'Territorio' } }
    ],
  }
];


