import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Card } from '@core/models/Card';

@Injectable({
  providedIn: 'root',
})
export class CardService {
  private router = inject(Router);

  dataCard: Card;
  constructor() {
    this.dataCard = {
      id: '0',
      location: '',
      numberTerritory: 0,
      iframe: '',
      driver: '',
      start: '',
      end: '',
      comments: '',
      link: '',
      applesData: [],
      revision: false,
      revisionComplete: false,
    };
  }
  rollbackCard(): void {
    this.dataCard.revision = false;
  }

  goRevisionCard(card: Card): void {
    card.revision = true;
    this.dataCard = card;
    void this.router.navigate([`territorios/${card.link}`]);
  }
}
