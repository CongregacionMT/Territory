import { Injectable, inject } from '@angular/core';
import { doc, docData, Firestore, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { CartDataArray, LocationsData } from '@core/models/Cart';

@Injectable({
  providedIn: 'root'
})
export class CartDataService {
  private firestore = inject(Firestore);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);


  constructor() { }

  getCartAssignment(): Observable<CartDataArray> {
    const cartRef = doc(this.firestore, "Cart", `docCart`);
    return (docData(cartRef) as Observable<CartDataArray>).pipe(take(1)); // Ensure the observable completes
  }

  putCartAssignment(cart: CartDataArray): Promise<void> {
    const cartRef = doc(this.firestore, "Cart", `docCart`);
    return updateDoc(cartRef, { ...cart });
  }

  getLocations(): Observable<LocationsData> {
    const locationRef = doc(this.firestore, "Cart", `locations`);
    return (docData(locationRef) as Observable<LocationsData>).pipe(take(1));
  }

  putLocations(location: LocationsData): Promise<void> {
    const cartRef = doc(this.firestore, "Cart", `locations`);
    return updateDoc(cartRef, { ...location });
  }
}
