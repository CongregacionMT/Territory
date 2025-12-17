import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData, setDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface CircuitOverseerData {
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class CircuitOverseerService {
  private firestore = inject(Firestore);

  getOverseerData(): Observable<CircuitOverseerData> {
    const docRef = doc(this.firestore, 'CircuitOverseer', 'data');
    return docData(docRef) as Observable<CircuitOverseerData>;
  }

  updateOverseerName(name: string): Promise<void> {
    const docRef = doc(this.firestore, 'CircuitOverseer', 'data');
    return setDoc(docRef, { name }, { merge: true });
  }
}
