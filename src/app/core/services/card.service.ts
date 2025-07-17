import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Card } from '@core/models/Card';

@Injectable({
  providedIn: 'root'
})
export class CardService {
  private router = inject(Router);

  dataCard: Card;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() { 
    this.dataCard = {
      id: 0,
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
      revisionComplete: false
    }
  }
  rollbackCard(){
    this.dataCard.revision = false;
  }

  goRevisionCard(card: Card){
    card.revision = true;
    this.dataCard = card;
    this.router.navigate([`territorios/${card.link}`])
  }
}
