import { Injectable } from '@angular/core';
import { doc, docData, Firestore, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartDataService {

  constructor(private firestore: Firestore) { }

  getCartAssignment(){
    const cartRef = doc(this.firestore, "Cart", `docCart`);
    return docData(cartRef) as Observable<any>;
  }

  putCartAssignment(cart: any){
    console.log("cart", cart);
    const cartRef = doc(this.firestore, "Cart", `docCart`);
    updateDoc(cartRef, cart);
  }
}
