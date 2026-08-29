import { Injectable, inject } from '@angular/core';
import { doc, docData, updateDoc, Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { CartDataArray, LocationsData } from '@core/models/Cart';
import { FirestoreProviderService } from './firestore-provider.service';

@Injectable({
  providedIn: 'root',
})
export class CartDataService {
  private readonly firestoreProvider = inject(FirestoreProviderService);
  private get firestore(): Firestore {
    return this.firestoreProvider.getFirestore();
  }
  constructor() {}

  getCartAssignment(): Observable<CartDataArray> {
    const cartRef = doc(this.firestore, 'Cart', `docCart`);
    return (docData(cartRef) as Observable<CartDataArray>).pipe(take(1)); // Ensure the observable completes
  }

  putCartAssignment(cart: CartDataArray): Promise<void> {
    const cartRef = doc(this.firestore, 'Cart', `docCart`);
    return updateDoc(cartRef, { ...cart });
  }

  getLocations(): Observable<LocationsData> {
    const locationRef = doc(this.firestore, 'Cart', `locations`);
    return (docData(locationRef) as Observable<LocationsData>).pipe(take(1));
  }

  putLocations(location: LocationsData): Promise<void> {
    const cartRef = doc(this.firestore, 'Cart', `locations`);
    return updateDoc(cartRef, { ...location });
  }
}
