import { Routes } from '@angular/router';
import { UsersPageComponent } from './users-page/users-page.component';

export const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: UsersPageComponent },
      { path: '**', redirectTo: '' },
    ],
  },
];
