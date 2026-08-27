import { Injectable } from '@angular/core';
import { initializeFirestore, persistentLocalCache, Firestore } from '@angular/fire/firestore';
import { getApp } from '@angular/fire/app';

@Injectable({
  providedIn: 'root',
})
export class FirestoreProviderService {
  private firestoreInstance: Firestore | null = null;

  getFirestore(): Firestore {
    if (!this.firestoreInstance) {
      this.firestoreInstance = initializeFirestore(getApp(), {
        localCache: persistentLocalCache(),
      });
    }
    return this.firestoreInstance;
  }
}
