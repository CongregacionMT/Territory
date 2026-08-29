import { Injectable, inject } from '@angular/core';
import { doc, docData, setDoc, Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { FirestoreProviderService } from '@core/services/firestore-provider.service';

export interface CircuitOverseerData {
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class CircuitOverseerService {
  private readonly firestoreProvider = inject(FirestoreProviderService);
  private get firestore(): Firestore {
    return this.firestoreProvider.getFirestore();
  }

  getOverseerData(): Observable<CircuitOverseerData> {
    const docRef = doc(this.firestore, 'CircuitOverseer', 'data');
    return docData(docRef) as Observable<CircuitOverseerData>;
  }

  updateOverseerName(name: string): Promise<void> {
    const docRef = doc(this.firestore, 'CircuitOverseer', 'data');
    return setDoc(docRef, { name }, { merge: true });
  }
}
