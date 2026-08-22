import { Routes } from '@angular/router';
import { CampaignPageComponent } from './campaign-page/campaign-page.component';
import { CampaignDetailComponent } from './campaign-detail/campaign-detail.component';

export const ROUTES: Routes = [
  {
    path: '', component: CampaignPageComponent,
  },
  {
    path: ':id', component: CampaignDetailComponent, data: { breadcrumb: 'Detalle' }
  }
];


