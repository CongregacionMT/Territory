import { Injectable } from '@angular/core';
import { SpinnerService } from './spinner.service';
import { doc, docData, Firestore, updateDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartDataService {

  constructor(private firestore: Firestore) { }

  getCartAssignment(){
    const departuresRef = doc(this.firestore, "Cart", `docCart`);
    return docData(departuresRef) as Observable<any>;
  }

  putCartAssignment(departures: any){
    const departuresRef = doc(this.firestore, "Cart", `docCart`);
    updateDoc(departuresRef, departures);
  }
}
