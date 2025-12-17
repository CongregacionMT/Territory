import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CampaignPageComponent } from './campaign-page/campaign-page.component';
import { CampaignDetailComponent } from './campaign-detail/campaign-detail.component';

const routes: Routes = [
  {
    path: '', component: CampaignPageComponent,
  },
  {
    path: ':id', component: CampaignDetailComponent,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CampaignRoutingModule { }
