import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Card } from '@core/models/Card';

@Injectable({
  providedIn: 'root'
})
export class CardService {
  dataCard: Card;
  constructor(private router: Router) { 
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
      revision: false
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
