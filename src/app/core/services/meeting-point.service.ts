import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, setDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { MeetingPoint } from '../models/MeetingPoint';
import { FirestoreProviderService } from './firestore-provider.service';

@Injectable({
  providedIn: 'root',
})
export class MeetingPointService {
  private readonly firestoreProvider = inject(FirestoreProviderService);
  private get firestore(): Firestore {
    return this.firestoreProvider.getFirestore();
  }
  private readonly collectionName = 'MeetingPoints';

  getMeetingPoints(): Observable<MeetingPoint[]> {
    const pointsRef = collection(this.firestore, this.collectionName);
    return collectionData(pointsRef, { idField: 'id' }) as Observable<MeetingPoint[]>;
  }

  async saveMeetingPoint(pointName: string, mapsUrl: string): Promise<void> {
    if (!pointName?.trim() || !mapsUrl?.trim()) {
      return;
    }

    const id = this.normalizePointName(pointName);
    const docRef = doc(this.firestore, this.collectionName, id);

    await setDoc(
      docRef,
      {
        name: pointName.trim(),
        mapsUrl: mapsUrl.trim(),
      },
      { merge: true },
    );
  }

  private normalizePointName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
