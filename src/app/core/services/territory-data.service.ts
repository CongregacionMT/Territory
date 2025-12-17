import { Injectable, inject } from '@angular/core';
import { collection, collectionData, Firestore, addDoc, query, orderBy, Timestamp, doc, updateDoc, deleteDoc, docData, where, setDoc, runTransaction } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { SpinnerService } from './spinner.service';
import { DataRural } from '@core/models/DataRural';
import { CampaignService } from './campaign.service';
import { MapData } from '@core/models/MapData';
import { Card } from '@core/models/Card';
import { Group } from '@core/models/Group';
import { StatisticsButton } from '@core/models/StatisticsButton';
import { User } from '@core/models/User';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { DateDeparture, DepartureData } from '@core/models/Departures';

@Injectable({
  providedIn: 'root'
})
export class TerritoryDataService {
  private firestore = inject(Firestore);
  private router = inject(Router);
  private spinner = inject(SpinnerService);
  private campaignService = inject(CampaignService);



  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() { }

  // MAPAS
  getMaps(): Observable<MapData[]>{
    const mapRef = collection(this.firestore, 'MapsTerritory');
    return collectionData(mapRef) as Observable<MapData[]>;
  }
  // NUMERO DE TERRITORIOS
  getNumberTerritory(): Observable<TerritoryNumberData[]>{
    const numberRef = collection(this.firestore, 'NumberTerritory');
    return collectionData(numberRef) as Observable<TerritoryNumberData[]>;
  }
  // TARJETAS DE CONDUCTORES
  getCardTerritorie(collectionParam: string): Observable<Card[]>{
    const cardRef = collection(this.firestore, collectionParam);
    // Limitar por defecto a los últimos 1 año para evitar traer datos muy antiguos
    const oneYearAgo = Timestamp.fromDate(
      new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    );
    const q = query(
      cardRef,
      where('creation', '>=', oneYearAgo),
      orderBy('creation', 'desc')
    );
    return collectionData(q) as Observable<Card[]>;
  }

  async sendRevisionCardTerritorie(card: Card){
    const cardRef = collection(this.firestore, "revision");
    await addDoc(cardRef, { ...card });
  }

  // TARJETAS PARA REVISIÓN
  getRevisionCardTerritorie(): Observable<Card[]>{
    const cardRef = collection(this.firestore, "revision");
    const q = query(cardRef, orderBy("creation", "desc"));
    return collectionData(q, {idField: 'id'}) as Observable<Card[]>;
  }

  private isCreating = false;
  async postCardTerritorie(card: Card, collectionName: string): Promise<void> {

    if (this.isCreating) {
      return;
    }

    this.isCreating = true;
    let countFalseApples = 0;
    card.revision = false;

    (card.applesData ?? []).forEach((apple) => {
      if (!apple?.checked) countFalseApples++;
    });

    try {

      const activeCampaign = this.campaignService.getCachedCampaign();
      const territorioKey = this.getTerritorioKeyStrict(card, collectionName);
      const isInCampaignMode = activeCampaign?.id != null;

      if (countFalseApples === 0) {
        const completedCard = { ...card, creation: Timestamp.now(), completed: (card.completed ?? 0) + 1 };
        
        // ✅ Solo usar ID personalizado si estamos en modo campaña
        if (isInCampaignMode) {
          const completedId = `Campaña-${activeCampaign.id}-${Date.now()}-completed`;
          await setDoc(doc(this.firestore, collectionName, completedId), completedCard);
          await this.incrementSalidasTx(activeCampaign.id, territorioKey);
        } else {
          // Usar ID auto-generado de Firebase
          const cardRef = collection(this.firestore, collectionName);
          await addDoc(cardRef, completedCard);
        }

        const resetCard = {
          ...card,
          creation: Timestamp.now(),
          completed: (card.completed ?? 0) + 1,
          applesData: (card.applesData ?? []).map((a) => ({ ...a, checked: false }))
        };
        
        // ✅ Solo usar ID personalizado si estamos en modo campaña
        if (isInCampaignMode) {
          const resetId = `Campaña-${activeCampaign.id}-${Date.now()}-reset`;
          await setDoc(doc(this.firestore, collectionName, resetId), resetCard);
        } else {
          // Usar ID auto-generado de Firebase
          const cardRef = collection(this.firestore, collectionName);
          await addDoc(cardRef, resetCard);
        }
      } else {
        const partialCard = { ...card, creation: Timestamp.now() };
        
        // ✅ Solo usar ID personalizado si estamos en modo campaña
        if (isInCampaignMode) {
          const cardId = `Campaña-${activeCampaign.id}-${Date.now()}`;
          await setDoc(doc(this.firestore, collectionName, cardId), partialCard);
          await this.incrementSalidasTx(activeCampaign.id, territorioKey);
        } else {
          // Usar ID auto-generado de Firebase
          const cardRef = collection(this.firestore, collectionName);
          await addDoc(cardRef, partialCard);
        }
      }
      this.router.navigate(['home']);
    } catch (err) {
      // Error handling
    } finally {
      this.spinner?.cerrarSpinner?.();
      this.isCreating = false;
    }
  }
  private async incrementSalidasTx(campaignId: string, territorioKey: string) {
    const ref = doc(this.firestore, 'campaigns', campaignId);
    try {
      await runTransaction(this.firestore, async (tx) => {

        const snap = await tx.get(ref);
        const exists = snap.exists();
        const data = exists ? (snap.data() as any) : {};
        const stats = data?.stats ?? {};
        const allKeys = Object.keys(stats || {});
        const territorio = stats[territorioKey] ?? {};
        const current = Number(territorio?.salidas ?? 0);
        const next = current + 1;

        // Build payload carefully to avoid overwriting other territories
        const payload = {
          stats: {
            [territorioKey]: {
              ...territorio,
              salidas: next
            }
          }
        };
        tx.update(ref, {
          [`stats.${territorioKey}.salidas`]: next
        });
      });

      // Read-after-write verification (outside transaction)
      const verifySnap = await (await import('firebase/firestore')).getDoc(ref);
      const verifyData = verifySnap.exists() ? (verifySnap.data() as any) : {};
      const verifyStats = verifyData?.stats ?? {};

      const verifyValue = Number(verifyStats?.[territorioKey]?.salidas ?? 0);
    } catch (err: any) {
      // Error handling
    } finally {
      // End transaction
    }
  }
  private getTerritorioKeyStrict(card: Card, collectionName: string): string {
    // Preferir el nombre de la colección si está disponible para evitar colisiones
    // entre localidades que tienen los mismos números de territorio (ej: TerritorioMT-1 y TerritorioC-1)
    if (collectionName) {
      return collectionName;
    }

    const sources = [
      String(card?.territoryNumber ?? ''),
      String(card?.territory ?? ''),
      String(card?.name ?? ''),
      String(card?.title ?? ''),
      String(collectionName ?? '')
    ];
    for (const s of sources) {
      const m = s.match(/(\d+)(?!.*\d)/);
      if (m) {
        const key = `Territorio ${m[1]}`;
        return key;
      }
    }
    return 'Territorio 0';
  }

  async putCardTerritorie(card: Card){
    if (!card.id) return;
    const revisionRef = doc(this.firestore, "revision", card.id);
    card.revisionComplete = true;
    updateDoc(revisionRef, { ...card });
  }

  deleteCardTerritorie(card: Card){
    if (!card.id) return;
    deleteDoc(doc(this.firestore, "revision", card.id));
  }
  // TARJETAS ASIGNADAS DURANTE LA SEMANA
  getCardAssigned(): Observable<Card[]>{
    const cardRef = collection(this.firestore, "Assigned");
    return collectionData(cardRef, {idField: 'id'}) as Observable<Card[]>;
  }
  postCardAssigned(card: Card){
    const cardRef = collection(this.firestore, "Assigned");
    return addDoc(cardRef, { ...card });
  }
  deleteCardAssigned(card: Card){
    if (!card.id) return;
    deleteDoc(doc(this.firestore, "Assigned", card.id));
  }
  // GRUPOS
  getGroupList(): Observable<Group[]>{
    const groupRef = collection(this.firestore, 'Groups');
    return collectionData(groupRef, {idField: 'id'}) as Observable<Group[]>;
  }
  setGroup(groupId: string, data: any) {
    const groupDoc = doc(this.firestore, 'Groups', groupId);
    return setDoc(groupDoc, data);
  }
  deleteGroup(groupId: string) {
    const groupDoc = doc(this.firestore, 'Groups', groupId);
    return deleteDoc(groupDoc);
  }

  // SALIDAS
  getDepartures(): Observable<DepartureData>{
    const departuresRef = doc(this.firestore, "Departures", `docDeparture`);
    return docData(departuresRef) as Observable<DepartureData>;
  }
  getDateDepartures(): Observable<DateDeparture>{
    const dateDeparturesRef = doc(this.firestore, "Departures", "dateDeparture");
    return docData(dateDeparturesRef) as Observable<DateDeparture>;
  }
  putDepartures(departures: DepartureData){
    const departuresRef = doc(this.firestore, "Departures", `docDeparture`);
    updateDoc(departuresRef, { ...departures });
  }
  putDate(date: DateDeparture){
    const departuresRef = doc(this.firestore, "Departures", `dateDeparture`);
    updateDoc(departuresRef, { ...date });
  }

  // RURAL
  getTerritorieRural(): Observable<DataRural[]>{
    const collectionRef = collection(this.firestore, "TerritorioRural");
    return collectionData(collectionRef, {idField: 'id'}) as Observable<DataRural[]>;
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
  getStatisticsButtons(): Observable<StatisticsButton[]>{
    const mapRef = collection(this.firestore, 'Statistics');
    return collectionData(mapRef) as Observable<StatisticsButton[]>;
  }
  // REGISTER
  getCardTerritorieRegisterTable(collectionParam: string): Observable<Card[]>{
    const cardRef = collection(this.firestore, collectionParam);
    const q = query(cardRef, orderBy("creation", "asc"));
    return collectionData(q) as Observable<Card[]>;
  }
  // USERS
  getUsers(): Observable<User[]>{
    const cardRef = collection(this.firestore, 'users');
    return collectionData(cardRef) as Observable<User[]>;
  }
  postUser(user: User){
    setDoc(doc(this.firestore, "users", user.user), user);
  }
  loginUser(user: string, password: string): Observable<User[]>{
    const userRef = collection(this.firestore, 'users');
    const q = query(userRef, where("user", "==", user), where("password", "==", password));
    return collectionData(q) as Observable<User[]>;
  }
  updateUser(user: string, dataUser: User){
    const userRef = doc(this.firestore, "users", user);
    updateDoc(userRef, { ...dataUser });
    return docData(userRef) as Observable<User>;
  }
  deleteUser(user: string){
    deleteDoc(doc(this.firestore, "users", user));
  }
}

