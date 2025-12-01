import { Injectable, inject } from '@angular/core';
import { collection, collectionData, Firestore, addDoc, query, orderBy, Timestamp, doc, updateDoc, deleteDoc, docData, where, setDoc, runTransaction } from '@angular/fire/firestore';
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
    // Limitar por defecto a los últimos 1 año para evitar traer datos muy antiguos
    const oneYearAgo = Timestamp.fromDate(
      new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    );
    const q = query(
      cardRef,
      where('creation', '>=', oneYearAgo),
      orderBy('creation', 'desc')
    );
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
      console.warn('[postCardTerritorie] blocked: isCreating true');
      return;
    }

    this.isCreating = true;
    this.countFalseApples = 0;
    card.revision = false;

    (card.applesData ?? []).forEach((apple: any) => {
      if (!apple?.checked) this.countFalseApples++;
    });

    try {

      const activeCampaign = this.campaignService.getCachedCampaign();
      const territorioKey = this.getTerritorioKeyStrict(card, collectionName);

      if (this.countFalseApples === 0) {
        const completedCard = { ...card, creation: Timestamp.now(), completed: (card.completed ?? 0) + 1 };
        const completedId = `Campaña-${activeCampaign?.id}-${Date.now()}-completed`;
        await setDoc(doc(this.firestore, collectionName, completedId), completedCard);
        if (activeCampaign?.id) {
          await this.incrementSalidasTx(activeCampaign.id, territorioKey);
        }

        const resetCard = {
          ...card,
          creation: Timestamp.now(),
          completed: (card.completed ?? 0) + 1,
          applesData: (card.applesData ?? []).map((a: any) => ({ ...a, checked: false }))
        };
        const resetId = `Campaña-${activeCampaign?.id}-${Date.now()}-reset`;
        await setDoc(doc(this.firestore, collectionName, resetId), resetCard);
      } else {
        const partialCard = { ...card, creation: Timestamp.now() };
        const cardId = `Campaña-${activeCampaign?.id}-${Date.now()}`;
        await setDoc(doc(this.firestore, collectionName, cardId), partialCard);

        if (activeCampaign?.id) {
          await this.incrementSalidasTx(activeCampaign.id, territorioKey);
        }
      }
      this.router.navigate(['home']);
    } catch (err) {
      console.error('[postCardTerritorie] ERROR:', err);
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
      console.error('[incrementSalidasTx] ERROR:', err?.name, err?.code, err?.message);
    } finally {
      console.log('--- [incrementSalidasTx] END ---');
    }
  }
  private getTerritorioKeyStrict(card: any, collectionName: string): string {
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
    console.warn('[getTerritorioKeyStrict] no number found, fallback Territorio 0; sources:', sources);
    return 'Territorio 0';
  }

  async putCardTerritorie(card: any){
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
