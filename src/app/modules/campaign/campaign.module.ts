import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CampaignRoutingModule } from './campaign-routing.module';
import { CampaignPageComponent } from './campaign-page/campaign-page.component';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    CampaignRoutingModule,
    CampaignPageComponent
  ]
})
export class CampaignModule { }
