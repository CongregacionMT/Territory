import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '@core/guards/unsaved-changes.guard';

export const ROUTES: Routes = [
  {
    path: '',
    children: [
      { 
        path: '', 
        loadComponent: () => import('./pages/home-departure-page/home-departure-page.component').then(m => m.HomeDeparturePageComponent) 
      },
      { 
        path: 'editar', 
        loadComponent: () => import('./pages/edit-departures/edit-departures.component').then(m => m.EditDeparturesComponent), 
        canDeactivate: [unsavedChangesGuard],
        data: { breadcrumb: 'Editar' }
      },
      { 
        path: 'gestion-publicadores', 
        loadComponent: () => import('./pages/manage-publishers/manage-publishers.component').then(m => m.ManagePublishersComponent),
        data: { breadcrumb: 'Gestionar Publicadores' }
      },
      { 
        path: 'grupo/:number', 
        loadComponent: () => import('./pages/departure-page/departure-page.component').then(m => m.DeparturePageComponent),
        data: { breadcrumb: 'Grupo' }
      },
      { 
        path: 'publicadores', 
        loadComponent: () => import('./pages/table-publishers-page/table-publishers-page.component').then(m => m.TablePublishersPageComponent),
        data: { breadcrumb: 'Publicadores' }
      },
      { 
        path: 'estadisticas', 
        loadComponent: () => import('./pages/statistics-departures/statistics-departures.component').then(m => m.StatisticsDeparturesComponent),
        data: { breadcrumb: 'Estadísticas' }
      },
      { path: '**', redirectTo: '' },
    ],
  },
];

