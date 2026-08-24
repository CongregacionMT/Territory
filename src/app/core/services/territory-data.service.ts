import { Injectable, inject, signal } from '@angular/core';
import {
  collection,
  collectionData,
  Firestore,
  addDoc,
  query,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  docData,
  where,
  setDoc,
  runTransaction,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Observable, tap, of } from 'rxjs';
import { SpinnerService } from './spinner.service';
import { DataRural } from '@core/models/DataRural';
import { CampaignService } from './campaign.service';
import { MapData } from '@core/models/MapData';
import { Card } from '@core/models/Card';
import { Group } from '@core/models/Group';
import { StatisticsButton } from '@core/models/StatisticsButton';
import { User } from '@core/models/User';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { DateDeparture, Departure, DepartureData, WeeklyDeparture } from '@core/models/Departures';

@Injectable({
  providedIn: 'root',
})
export class TerritoryDataService {
  private firestore = inject(Firestore);
  private router = inject(Router);
  private spinner = inject(SpinnerService);
  private campaignService = inject(CampaignService);

  // Cached state via Signals to avoid relying on sessionStorage everywhere
  private _cachedNumberTerritory = signal<any>(null);
  private _cachedStatistics = signal<StatisticsButton | null>(null);

  // MAPAS
  getMaps(): Observable<MapData[]> {
    const mapRef = collection(this.firestore, 'MapsTerritory');
    return collectionData(mapRef) as Observable<MapData[]>;
  }

  // NUMERO DE TERRITORIOS (with caching)
  getNumberTerritory(): Observable<TerritoryNumberData[]> {
    if (this._cachedNumberTerritory()) {
      return of([this._cachedNumberTerritory()]); // Return as array to match signature
    }
    const numberRef = collection(this.firestore, 'NumberTerritory');
    return (collectionData(numberRef) as Observable<TerritoryNumberData[]>).pipe(
      tap((numbers: TerritoryNumberData[]) => {
        const mergedData = numbers.reduce((acc: any, curr: any) => ({ ...acc, ...curr }), {});
        this._cachedNumberTerritory.set(mergedData);
        sessionStorage.setItem('numberTerritory', JSON.stringify(mergedData));
      }),
    );
  }

  // GRUPOS DE TERRITORIOS
  getTerritoryGroups(): Observable<any> {
    const docRef = doc(this.firestore, 'Settings', 'TerritoryGroups');
    return docData(docRef);
  }

  async saveTerritoryGroups(data: any) {
    const docRef = doc(this.firestore, 'Settings', 'TerritoryGroups');
    await setDoc(docRef, data);
  }
  // TARJETAS DE CONDUCTORES
  getCardTerritorie(collectionParam: string, months: number = 12): Observable<Card[]> {
    const cardRef = collection(this.firestore, collectionParam);
    // Limitar por defecto a los últimos X meses para evitar traer datos muy antiguos
    const fromDate = Timestamp.fromDate(
      new Date(new Date().setMonth(new Date().getMonth() - months)),
    );
    const q = query(cardRef, where('creation', '>=', fromDate), orderBy('creation', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Card[]>;
  }

  async sendRevisionCardTerritorie(card: Card) {
    const cardRef = collection(this.firestore, 'revision');
    await addDoc(cardRef, { ...card });
  }

  // TARJETAS PARA REVISIÓN
  getRevisionCardTerritorie(): Observable<Card[]> {
    const cardRef = collection(this.firestore, 'revision');
    const q = query(cardRef, orderBy('creation', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Card[]>;
  }

  private isCreating = false;
  async postCardTerritorie(card: Card, collectionName: string): Promise<void> {
    if (this.isCreating) {
      return;
    }

    if (!collectionName?.trim()) {
      console.error('[TerritoryDataService] postCardTerritorie: collectionName is empty');
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
      const campaignIdValid =
        activeCampaign?.id && activeCampaign.id !== 'undefined' ? activeCampaign.id : null;
      const isInCampaignMode = campaignIdValid != null;

      if (countFalseApples === 0) {
        const completedCard = {
          ...card,
          creation: Timestamp.now(),
          completed: (card.completed ?? 0) + 1,
          isInitial: false,
        };

        // ✅ Solo usar ID personalizado si estamos en modo campaña
        if (isInCampaignMode) {
          const completedId = `Campaña-${campaignIdValid}-${Date.now()}-completed`;
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
          isInitial: false,
          applesData: (card.applesData ?? []).map((a) => ({
            ...a,
            checked: false,
          })),
        };

        // ✅ Solo usar ID personalizado si estamos en modo campaña
        if (isInCampaignMode) {
          const resetId = `Campaña-${campaignIdValid}-${Date.now()}-reset`;
          await setDoc(doc(this.firestore, collectionName, resetId), resetCard);
        } else {
          // Usar ID auto-generado de Firebase
          const cardRef = collection(this.firestore, collectionName);
          await addDoc(cardRef, resetCard);
        }
      } else {
        const partialCard = {
          ...card,
          creation: Timestamp.now(),
          isInitial: false,
        };

        // ✅ Solo usar ID personalizado si estamos en modo campaña
        if (isInCampaignMode) {
          const cardId = `Campaña-${campaignIdValid}-${Date.now()}`;
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
        const data = exists ? (snap.data() as Card) : {};
        const stats = (data as Record<string, any>)?.[`stats`] ?? {};
        const allKeys = Object.keys(stats || {});
        const territorio = stats[territorioKey] ?? {};
        const current = Number(territorio?.salidas ?? 0);
        const next = current + 1;

        // Build payload carefully to avoid overwriting other territories
        const payload = {
          stats: {
            [territorioKey]: {
              ...territorio,
              salidas: next,
            },
          },
        };
        tx.update(ref, {
          [`stats.${territorioKey}.salidas`]: next,
        });
      });

      // Read-after-write verification (outside transaction)
      const verifySnap = await (await import('firebase/firestore')).getDoc(ref);
      const verifyData = verifySnap.exists() ? (verifySnap.data() as Card) : {};
      const verifyStats = (verifyData as Record<string, any>)?.[`stats`] ?? {};

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
      String(collectionName ?? ''),
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

  async putCardTerritorie(card: Card) {
    if (!card.id) return;
    const revisionRef = doc(this.firestore, 'revision', card.id);
    card.revisionComplete = true;
    updateDoc(revisionRef, { ...card });
  }

  deleteCardTerritorie(card: Card) {
    if (!card.id) return;
    deleteDoc(doc(this.firestore, 'revision', card.id));
  }
  // TARJETAS ASIGNADAS DURANTE LA SEMANA
  getCardAssigned(): Observable<Card[]> {
    const cardRef = collection(this.firestore, 'Assigned');
    return collectionData(cardRef, { idField: 'id' }) as Observable<Card[]>;
  }
  postCardAssigned(card: Card) {
    const cardRef = collection(this.firestore, 'Assigned');
    return addDoc(cardRef, { ...card });
  }
  deleteCardAssigned(card: Card) {
    if (!card.id) return;
    deleteDoc(doc(this.firestore, 'Assigned', card.id));
  }
  // GRUPOS
  getGroupList(): Observable<Group[]> {
    const groupRef = collection(this.firestore, 'Groups');
    return collectionData(groupRef, { idField: 'id' }) as Observable<Group[]>;
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
  getDepartures(): Observable<DepartureData> {
    const departuresRef = doc(this.firestore, 'Departures', `docDeparture`);
    return docData(departuresRef) as Observable<DepartureData>;
  }
  getDateDepartures(): Observable<DateDeparture> {
    const dateDeparturesRef = doc(this.firestore, 'Departures', 'dateDeparture');
    return docData(dateDeparturesRef) as Observable<DateDeparture>;
  }
  putDepartures(departures: DepartureData) {
    const departuresRef = doc(this.firestore, 'Departures', `docDeparture`);
    updateDoc(departuresRef, { ...departures });
  }
  putDate(date: DateDeparture) {
    const departuresRef = doc(this.firestore, 'Departures', `dateDeparture`);
    updateDoc(departuresRef, { ...date });
  }

  createDepartureId(weekId: string, departure: Departure, index: number = 0): string {
    const raw = [
      weekId,
      departure.date || 'sin-fecha',
      departure.schedule || 'sin-hora',
      departure.group ?? 0,
      index,
    ].join('-');

    return raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  normalizeDepartureForCardTracking(
    departure: Departure,
    weekId: string,
    index: number,
  ): Departure {
    const departureId = departure.departureId || this.createDepartureId(weekId, departure, index);

    if (departure.isEvent) {
      return {
        ...departure,
        departureId,
        cardStatus: 'not_required',
      };
    }

    const status =
      departure.cardStatus && departure.cardStatus !== 'not_required'
        ? departure.cardStatus
        : 'pending';

    return {
      ...departure,
      departureId,
      cardStatus: status,
    };
  }

  // HISTORIAL DE SALIDAS
  getWeeklyDepartures(): Observable<WeeklyDeparture[]> {
    const departuresRef = collection(this.firestore, 'WeeklyDepartures');
    const q = query(departuresRef, orderBy('weekId', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<WeeklyDeparture[]>;
  }

  getWeeklyDeparture(weekId: string): Observable<WeeklyDeparture | undefined> {
    const departuresRef = doc(this.firestore, 'WeeklyDepartures', weekId);
    return docData(departuresRef, { idField: 'id' }) as Observable<WeeklyDeparture | undefined>;
  }

  async postWeeklyDeparture(weeklyDeparture: WeeklyDeparture) {
    const departuresRef = collection(this.firestore, 'WeeklyDepartures');
    // Usamos weekId como ID del documento para que sea único por semana y sea fácil de actualizar si se vuelve a guardar
    const docRef = doc(departuresRef, weeklyDeparture.weekId);
    const normalizedDepartures = (weeklyDeparture.departure || []).map((departure, index) =>
      this.normalizeDepartureForCardTracking(departure, weeklyDeparture.weekId, index),
    );
    await setDoc(docRef, {
      ...weeklyDeparture,
      departure: normalizedDepartures,
      createdAt: Timestamp.now(),
    });
  }

  async deleteWeeklyDeparture(weekId: string) {
    const departuresRef = doc(this.firestore, 'WeeklyDepartures', weekId);
    await deleteDoc(departuresRef);
  }

  // RURAL
  getTerritorieRural(): Observable<DataRural[]> {
    const collectionRef = collection(this.firestore, 'TerritorioRural');
    return collectionData(collectionRef, { idField: 'id' }) as Observable<DataRural[]>;
  }
  postNewRoad(road: DataRural) {
    const cardRef = collection(this.firestore, 'TerritorioRural');
    return addDoc(cardRef, road);
  }
  putNewRoad(road: any, docId: string) {
    const roadRef = doc(this.firestore, 'TerritorioRural', docId);
    updateDoc(roadRef, road);
  }
  deleteRoad(docId: string) {
    deleteDoc(doc(this.firestore, 'TerritorioRural', docId));
  }
  // ESTADÍSTICAS
  getStatisticsButtons(): Observable<StatisticsButton[]> {
    if (this._cachedStatistics()) {
      return of([this._cachedStatistics()!]);
    }
    const mapRef = collection(this.firestore, 'Statistics');
    return (collectionData(mapRef) as Observable<StatisticsButton[]>).pipe(
      tap((number: StatisticsButton[]) => {
        if (number.length > 0) {
          this._cachedStatistics.set(number[0]);
          sessionStorage.setItem('territorioStatistics', JSON.stringify(number[0]));
        }
      }),
    );
  }
  // REGISTER
  getCardTerritorieRegisterTable(collectionParam: string): Observable<Card[]> {
    const cardRef = collection(this.firestore, collectionParam);
    const q = query(cardRef, orderBy('creation', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Card[]>;
  }

  async updateCardInCollection(collectionName: string, cardId: string, updatedData: Partial<Card>) {
    const cardRef = doc(this.firestore, collectionName, cardId);
    await updateDoc(cardRef, updatedData);
  }

  async deleteCardInCollection(collectionName: string, cardId: string) {
    const cardRef = doc(this.firestore, collectionName, cardId);
    await deleteDoc(cardRef);
  }

  async addCardInCollection(collectionName: string, cardData: Partial<Card>) {
    const cardRef = collection(this.firestore, collectionName);
    const completedCard = {
      ...cardData,
      // Asegurar que applesData siempre esté presente como array
      applesData: cardData.applesData ?? [],
      creation: Timestamp.now(),
      isInitial: false,
    };
    await addDoc(cardRef, completedCard);
  }
  // USERS
  getUsers(): Observable<User[]> {
    const cardRef = collection(this.firestore, 'users');
    return collectionData(cardRef) as Observable<User[]>;
  }
  postUser(user: User) {
    setDoc(doc(this.firestore, 'users', user.user), user);
  }
  loginUser(user: string, password: string): Observable<User[]> {
    const userRef = collection(this.firestore, 'users');
    const q = query(userRef, where('user', '==', user), where('password', '==', password));
    return collectionData(q) as Observable<User[]>;
  }
  updateUser(user: string, dataUser: User) {
    const userRef = doc(this.firestore, 'users', user);
    updateDoc(userRef, { ...dataUser });
    return docData(userRef) as Observable<User>;
  }
  deleteUser(user: string) {
    deleteDoc(doc(this.firestore, 'users', user));
  }
}
