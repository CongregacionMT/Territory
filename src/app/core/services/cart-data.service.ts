import { Injectable } from '@angular/core';
import { doc, docData, Firestore, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CartDataService {

  constructor(private firestore: Firestore) { }

  getCartAssignment(): Observable<any> {
    const cartRef = doc(this.firestore, "Cart", `docCart`);
    return docData(cartRef).pipe(take(1)); // Ensure the observable completes
  }

  putCartAssignment(cart: any): Promise<void> {
    const cartRef = doc(this.firestore, "Cart", `docCart`);
    return updateDoc(cartRef, cart);
  }

  getLocations(): Observable<any> {
    const locationRef = doc(this.firestore, "Cart", `locations`);
    return docData(locationRef).pipe(take(1));
  }

  putLocations(location: any): Promise<void> {
    const cartRef = doc(this.firestore, "Cart", `locations`);
    return updateDoc(cartRef, location);
  }
}
