import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-campaign-page',
  imports: [FormsModule],
  templateUrl: './campaign-page.component.html',
  styleUrl: './campaign-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CampaignPageComponent {
  campaignName = signal('');
  campaignDescription = signal('');
  campaignInProgress = signal(false);

  territorios = signal(
    Array.from({ length: 23 }, (_, i) => ({
      nombre: `Territorio ${i + 1}`,
      porcentaje: 0
    }))
  );

  campaignHistory = signal<{ nombre: string; descripcion: string; fecha: string }[]>([]);

  constructor(){
    
  }

  startCampaign() {
    this.campaignInProgress.set(true);
    console.log('Campaña iniciada:', this.campaignName(), this.campaignDescription());
    // Acá iría tu lógica de reiniciar manzanas a false
  }

  endCampaign() {
    this.campaignInProgress.set(false);
    this.campaignHistory.update(history => [
      ...history,
      {
        nombre: this.campaignName(),
        descripcion: this.campaignDescription(),
        fecha: new Date().toLocaleDateString()
      }
    ]);
    console.log('Campaña finalizada');
    // Y acá también reiniciarías las manzanas
  }
}
