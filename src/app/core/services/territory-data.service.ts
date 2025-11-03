import { Injectable, inject } from '@angular/core';
import { collection, collectionData, Firestore, addDoc, query, orderBy, Timestamp, doc, updateDoc, deleteDoc, docData, where, setDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { SpinnerService } from './spinner.service';
import { DataRural } from '@core/models/DataRural';
import { CampaignService } from './campaign.service';

@Injectable({
  providedIn: 'root'
})
export class TerritoryDataService {
  private firestore = inject(Firestore);
  private router = inject(Router);
  private spinner = inject(SpinnerService);
  private campaignService = inject(CampaignService);

  diferent: boolean = false;
  countFalseApples: number = 0;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() { }

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

  private isCreating = false;

  async postCardTerritorie(card: any, collectionName: string): Promise<void> {
    if (this.isCreating) {
      console.warn('Ya se está creando una tarjeta. Cancelado.');
      return;
    }

    this.isCreating = true;
    this.countFalseApples = 0;

    card.revision = false;

    // Contar los que están en false
    card.applesData.forEach((apple: any) => {
      if (!apple.checked) this.countFalseApples++;
    });

    try {
      // 🔥 Verificar si hay campaña activa
      const activeCampaign = this.campaignService.getCachedCampaign();

      if (this.countFalseApples === 0) {
        // Caso: todos los checkboxes marcados ✅
        const completedCard = { ...card };
        completedCard.completed += 1;
        completedCard.creation = Timestamp.now();

        if (activeCampaign) {
          // Guardar con ID personalizado
          const completedId = `Campaña-${activeCampaign.id}-${Date.now()}-completed`;
          const completedRef = doc(this.firestore, collectionName, completedId);
          await setDoc(completedRef, completedCard);
        } else {
          // Guardar con ID automático
          await addDoc(collection(this.firestore, collectionName), completedCard);
        }

        // Delay artificial
        await new Promise(resolve => setTimeout(resolve, 10));

        // Crear la nueva tarjeta vacía ❌
        const resetCard = {
          ...card,
          completed: card.completed + 1,
          applesData: card.applesData.map((apple: any) => ({
            ...apple,
            checked: false
          })),
          creation: Timestamp.now()
        };

        if (activeCampaign) {
          const resetId = `Campaña-${activeCampaign.id}-${Date.now()}-reset`;
          const resetRef = doc(this.firestore, collectionName, resetId);
          await setDoc(resetRef, resetCard);
        } else {
          await addDoc(collection(this.firestore, collectionName), resetCard);
        }

      } else {
        // Caso: algunos checkboxes en false todavía
        card.creation = Timestamp.now();

        if (activeCampaign) {
          const cardId = `Campaña-${activeCampaign.id}-${Date.now()}`;
          const cardRef = doc(this.firestore, collectionName, cardId);
          await setDoc(cardRef, card);
        } else {
          await addDoc(collection(this.firestore, collectionName), card);
        }
      }

      this.router.navigate(['home']);
      this.spinner.cerrarSpinner();
    } catch (err) {
      console.error('Error al guardar la tarjeta:', err);
      this.spinner.cerrarSpinner();
    } finally {
      this.isCreating = false;
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
  postUser(user: any){
    setDoc(doc(this.firestore, "users", user.user), user);
  }
  loginUser(user: string, password: string){
    const userRef = collection(this.firestore, 'users');
    const q = query(userRef, where("user", "==", user), where("password", "==", password));
    return collectionData(q) as Observable<any>;
  }
  updateUser(user: string, dataUser: any){
    const userRef = doc(this.firestore, "users", user);
    updateDoc(userRef, dataUser);
    return docData(userRef) as Observable<any>;
  }
  deleteUser(user: string){
    deleteDoc(doc(this.firestore, "users", user));
  }
}
