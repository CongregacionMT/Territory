import { Injectable, inject } from '@angular/core';
import { initializeFirestore, persistentLocalCache, Firestore } from '@angular/fire/firestore';
import { FirebaseApp } from '@angular/fire/app';

@Injectable({
  providedIn: 'root',
})
export class FirestoreProviderService {
  private firestoreInstance: Firestore | null = null;
  private readonly firebaseApp = inject(FirebaseApp);

  getFirestore(): Firestore {
    if (!this.firestoreInstance) {
      this.firestoreInstance = initializeFirestore(this.firebaseApp, {
        localCache: persistentLocalCache(),
      });
    }
    return this.firestoreInstance;
  }
}
