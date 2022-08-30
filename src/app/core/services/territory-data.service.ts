import { Injectable } from '@angular/core';
import { collection, collectionData, Firestore, addDoc, query, orderBy, Timestamp, deleteDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TerritoryDataService {
  // PATH
  // 0 => MT
  // 1 => CHT
  // 2 => RURAL
  pathNumberTerritory: number = 0;
  
  diferent: boolean = false;
  countFalseApples: number = 0;
  constructor(private firestore: Firestore, private router: Router) { }

  // TARJETAS DE CONDUCTORES
  getCardTerritorie(collectionParam: string): Observable<any>{
    const cardRef = collection(this.firestore, collectionParam);
    const q = query(cardRef, orderBy("creation", "desc"));
    return collectionData(q) as Observable<any>;
  }

  sendRevisionCardTerritorie(card: any){
    const cardRef = collection(this.firestore, "revision"); 
    this.router.navigate(['home']);
    setTimeout(() => {
      alert("La tarjeta se envió correctamente! Muchas gracias 😁");  
    }, 1000);
    return addDoc(cardRef, card);
  }

  // TARJETAS PARA REVICIÓN
  getRevisionCardTerritorie(): Observable<any>{
    const cardRef = collection(this.firestore, "revision");
    const q = query(cardRef, orderBy("creation", "desc"));
    return collectionData(q) as Observable<any>;
  }

  postCardTerritorie(card: any, collectionName: any){
    card.revision = false;
    const cardRef = collection(this.firestore, collectionName);    
    this.countFalseApples = 0;
    card.applesData.map((apple: any) => {
      if(apple.checked === false){
        this.countFalseApples+=1;
      }
    });
    if(this.countFalseApples === 0){
      addDoc(cardRef, card);
      card.applesData.map((apple: any) => {
        apple.checked = false;
      });
      card.completed+=1
      card.creation = Timestamp.now()
      addDoc(cardRef, card);
      this.router.navigate(['home']);
      return
    } else {
      this.router.navigate(['home']);
      return addDoc(cardRef, card);
    }
  }
}
