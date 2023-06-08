import { Injectable } from '@angular/core';
import { collection, collectionData, Firestore, addDoc, query, orderBy, Timestamp, doc, updateDoc, deleteDoc, docData, where } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { SpinnerService } from './spinner.service';
import { DataRural } from '@core/models/DataRural';

@Injectable({
  providedIn: 'root'
})
export class TerritoryDataService {
  diferent: boolean = false;
  countFalseApples: number = 0;
  constructor(private firestore: Firestore, private router: Router, private spinner: SpinnerService) { }

  // MAPAS
  getMaps(){
    const mapRef = collection(this.firestore, 'MapsTerritory');
    return collectionData(mapRef) as Observable<any>;
  }
  // NUMERO DE TERRITORIOS
  getNumberTerritory(){
    const numberRef = collection(this.firestore, 'NumberTerritory');
    return collectionData(numberRef) as Observable<any>;
  }
  // TARJETAS DE CONDUCTORES
  getCardTerritorie(collectionParam: string): Observable<any>{
    const cardRef = collection(this.firestore, collectionParam);
    const q = query(cardRef, orderBy("creation", "desc"));
    return collectionData(q) as Observable<any>;
  }

  async sendRevisionCardTerritorie(card: any){
    const cardRef = collection(this.firestore, "revision");
    await addDoc(cardRef, card);
  }

  // TARJETAS PARA REVISIÓN
  getRevisionCardTerritorie(): Observable<any>{
    const cardRef = collection(this.firestore, "revision");
    const q = query(cardRef, orderBy("creation", "desc"));
    return collectionData(q, {idField: 'id'}) as Observable<any>;
  }

  postCardTerritorie(card: any, collectionName: any){
    card.revision = false;
    const cardRef = collection(this.firestore, collectionName);
    this.countFalseApples = 0;
    card.applesData.map((apple: any) => {
      if(apple.checked === false){
        this.countFalseApples+=1;
      }
    });
    if(this.countFalseApples === 0){
      addDoc(cardRef, card);
      card.applesData.map((apple: any) => {
        apple.checked = false;
      });
      card.completed+=1
      card.creation = Timestamp.now()
      addDoc(cardRef, card);
      this.router.navigate(['home']);
      this.spinner.cerrarSpinner()
      return
    } else {
      this.router.navigate(['home']);
      this.spinner.cerrarSpinner()
      return addDoc(cardRef, card);
    }
  }

  putCardTerritorie(card: any){
    const revisionRef = doc(this.firestore, "revision", card.id);
    card.revisionComplete = true;
    updateDoc(revisionRef, card);
  }

  deleteCardTerritorie(card: any){
    deleteDoc(doc(this.firestore, "revision", card.id));
  }
  // TARJETAS ASIGNADAS DURANTE LA SEMANA
  getCardAssigned(){
    const cardRef = collection(this.firestore, "Assigned");
    return collectionData(cardRef, {idField: 'id'}) as Observable<any>;
  }
  postCardAssigned(card: any){
    const cardRef = collection(this.firestore, "Assigned");
    return addDoc(cardRef, card);
  }
  deleteCardAssigned(card: any){
    deleteDoc(doc(this.firestore, "Assigned", card.id));
  }
  // GRUPOS
  getGroupList(){
    const groupRef = collection(this.firestore, 'Groups');
    return collectionData(groupRef, {idField: 'id'}) as Observable<any>;
  }

  // SALIDAS
  getDepartures(){
    const departuresRef = doc(this.firestore, "Departures", `docDeparture`);
    return docData(departuresRef) as Observable<any>;
  }
  getDateDepartures(){
    const dateDeparturesRef = doc(this.firestore, "Departures", "dateDeparture");
    return docData(dateDeparturesRef) as Observable<any>;
  }
  putDepartures(departures: any){
    const departuresRef = doc(this.firestore, "Departures", `docDeparture`);
    updateDoc(departuresRef, departures);
  }
  putDate(date: any){
    const departuresRef = doc(this.firestore, "Departures", `dateDeparture`);
    updateDoc(departuresRef, date);
  }

  // RURAL
  getTerritorieRural(){
    const collectionRef = collection(this.firestore, "TerritorioRural");
    return collectionData(collectionRef, {idField: 'id'}) as Observable<any>;
  }
  postNewRoad(road: DataRural){
    const cardRef = collection(this.firestore, "TerritorioRural");
    return addDoc(cardRef, road);
  }
  putNewRoad(road: any, docId: string){
    const roadRef = doc(this.firestore, "TerritorioRural", docId);
    updateDoc(roadRef, road);
  }
  deleteRoad(docId: string){
    deleteDoc(doc(this.firestore, "TerritorioRural", docId));
  }
  // ESTADÍSTICAS
  getStatisticsButtons(){
    const mapRef = collection(this.firestore, 'Statistics');
    return collectionData(mapRef) as Observable<any>;
  }
  // REGISTER
  getCardTerritorieRegisterTable(collectionParam: string): Observable<any>{
    const cardRef = collection(this.firestore, collectionParam);
    const q = query(cardRef, orderBy("creation", "asc"));
    return collectionData(q) as Observable<any>;
  }
  // USERS
  getUsers(){
    const cardRef = collection(this.firestore, 'users');
    return collectionData(cardRef) as Observable<any>;
  }
  loginUser(user: string, password: string){
    const userRef = collection(this.firestore, 'users');
    const q = query(userRef, where("user", "==", user), where("password", "==", password));
    return collectionData(q) as Observable<any>;
  }
  updateUser(user: string, dataUser: any){
    const userRef = doc(this.firestore, "users", user);
    updateDoc(userRef, dataUser);
  }
  deleteUser(user: string){
    deleteDoc(doc(this.firestore, "users", user));
  }
}
