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
  private readonly firestore = inject(Firestore);
  private readonly router = inject(Router);
  private readonly spinner = inject(SpinnerService);
  private readonly campaignService = inject(CampaignService);

  // Cached state via Signals to avoid relying on sessionStorage everywhere
  private readonly _cachedNumberTerritory = signal<TerritoryNumberData | null>(null);
  private readonly _cachedStatistics = signal<StatisticsButton | null>(null);

  // MAPAS
  getMaps(): Observable<MapData[]> {
    const mapRef = collection(this.firestore, 'MapsTerritory');
    return collectionData(mapRef) as Observable<MapData[]>;
  }

  // NUMERO DE TERRITORIOS (with caching)
  getNumberTerritory(): Observable<TerritoryNumberData[]> {
    if (this._cachedNumberTerritory()) {
      return of([this._cachedNumberTerritory() as TerritoryNumberData]); // Return as array to match signature
    }
    const numberRef = collection(this.firestore, 'NumberTerritory');
    return (collectionData(numberRef) as Observable<TerritoryNumberData[]>).pipe(
      tap((numbers: TerritoryNumberData[]) => {
        const mergedData = numbers.reduce(
          (acc: TerritoryNumberData, curr: TerritoryNumberData) => ({ ...acc, ...curr }),
          {} as TerritoryNumberData,
        );
        this._cachedNumberTerritory.set(mergedData);
        sessionStorage.setItem('numberTerritory', JSON.stringify(mergedData));
      }),
    );
  }

  // GRUPOS DE TERRITORIOS
  getTerritoryGroups(): Observable<Record<string, Record<number, number>>> {
    const docRef = doc(this.firestore, 'Settings', 'TerritoryGroups');
    return docData(docRef) as Observable<Record<string, Record<number, number>>>;
  }

  async saveTerritoryGroups(data: unknown): Promise<void> {
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

  async sendRevisionCardTerritorie(card: Card): Promise<void> {
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
      const activeCampaign = this.campaignService.getCachedCampaign() as { id?: string } | null;
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

        const completedId =
          isInCampaignMode && activeCampaign
            ? `Campaña-${campaignIdValid}-${Date.now()}-completed`
            : null;
        await this.saveDocument(collectionName, completedId, completedCard);
        if (completedId && campaignIdValid) {
          await this.incrementSalidasTx(campaignIdValid, territorioKey);
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

        const resetId = isInCampaignMode ? `Campaña-${campaignIdValid}-${Date.now()}-reset` : null;
        await this.saveDocument(collectionName, resetId, resetCard);
      } else {
        const partialCard = {
          ...card,
          creation: Timestamp.now(),
          isInitial: false,
        };

        const cardId =
          isInCampaignMode && activeCampaign ? `Campaña-${campaignIdValid}-${Date.now()}` : null;
        await this.saveDocument(collectionName, cardId, partialCard);
        if (cardId && campaignIdValid) {
          await this.incrementSalidasTx(campaignIdValid, territorioKey);
        }
      }
      void this.router.navigate(['home']);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      this.spinner?.cerrarSpinner?.();
      this.isCreating = false;
    }
  }

  private async saveDocument(
    collectionName: string,
    docId: string | null,
    data: Record<string, unknown>,
  ): Promise<void> {
    if (docId) {
      await setDoc(doc(this.firestore, collectionName, docId), data);
    } else {
      const cardRef = collection(this.firestore, collectionName);
      await addDoc(cardRef, data);
    }
  }
  private async incrementSalidasTx(campaignId: string, territorioKey: string): Promise<void> {
    const ref = doc(this.firestore, 'campaigns', campaignId);
    try {
      await runTransaction(this.firestore, async (tx) => {
        const snap = await tx.get(ref);
        const exists = snap.exists();
        const data = exists ? (snap.data() as Card) : {};

        // Define a type for stats to avoid 'any'
        type StatEntry = { salidas?: number };
        type StatsData = Record<string, StatEntry>;

        const stats = ((data as Record<string, unknown>)?.[`stats`] as StatsData) ?? {};
        const territorio = stats[territorioKey] ?? {};
        const current = Number(territorio.salidas ?? 0);
        const next = current + 1;

        tx.update(ref, {
          [`stats.${territorioKey}.salidas`]: next,
        });
      });
      // The read-after-write verification is intentionally removed because variables were unused
    } catch (err: unknown) {
      console.error(err);
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
      const m = /(\d+)(?=\D*$)/.exec(s);
      if (m) {
        const key = `Territorio ${m[1]}`;
        return key;
      }
    }
    return 'Territorio 0';
  }

  async putCardTerritorie(card: Card): Promise<void> {
    if (!card.id) return;
    const revisionRef = doc(this.firestore, 'revision', card.id);
    card.revisionComplete = true;
    await updateDoc(revisionRef, { ...card });
  }

  deleteCardTerritorie(card: Card): void {
    if (!card.id) return;
    void deleteDoc(doc(this.firestore, 'revision', card.id));
  }
  // TARJETAS ASIGNADAS DURANTE LA SEMANA
  getCardAssigned(): Observable<Card[]> {
    const cardRef = collection(this.firestore, 'Assigned');
    return collectionData(cardRef, { idField: 'id' }) as Observable<Card[]>;
  }
  async postCardAssigned(card: Card): Promise<void> {
    const cardRef = collection(this.firestore, 'Assigned');
    await addDoc(cardRef, { ...card });
  }
  deleteCardAssigned(card: Card): void {
    if (!card.id) return;
    void deleteDoc(doc(this.firestore, 'Assigned', card.id));
  }
  // GRUPOS
  getGroupList(): Observable<Group[]> {
    const groupRef = collection(this.firestore, 'Groups');
    return collectionData(groupRef, { idField: 'id' }) as Observable<Group[]>;
  }
  async setGroup(groupId: string, data: unknown): Promise<void> {
    const groupDoc = doc(this.firestore, 'Groups', groupId);
    await setDoc(groupDoc, data);
  }
  async deleteGroup(groupId: string): Promise<void> {
    const groupDoc = doc(this.firestore, 'Groups', groupId);
    await deleteDoc(groupDoc);
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
  async putDepartures(departures: DepartureData): Promise<void> {
    const departuresRef = doc(this.firestore, 'Departures', `docDeparture`);
    await updateDoc(departuresRef, { ...departures });
  }
  async putDate(date: DateDeparture): Promise<void> {
    const departuresRef = doc(this.firestore, 'Departures', 'dateDeparture');
    await updateDoc(departuresRef, { ...date });
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

  async postWeeklyDeparture(weeklyDeparture: WeeklyDeparture): Promise<void> {
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

  async deleteWeeklyDeparture(weekId: string): Promise<void> {
    const departuresRef = doc(this.firestore, 'WeeklyDepartures', weekId);
    await deleteDoc(departuresRef);
  }

  // RURAL
  getTerritorieRural(): Observable<DataRural[]> {
    const collectionRef = collection(this.firestore, 'TerritorioRural');
    return collectionData(collectionRef, { idField: 'id' }) as Observable<DataRural[]>;
  }
  async postNewRoad(road: DataRural): Promise<void> {
    const cardRef = collection(this.firestore, 'TerritorioRural');
    await addDoc(cardRef, road);
  }
  async putNewRoad(road: unknown, docId: string): Promise<void> {
    const roadRef = doc(this.firestore, 'TerritorioRural', docId);
    await updateDoc(roadRef, road as Record<string, unknown>);
  }
  deleteRoad(docId: string): void {
    void deleteDoc(doc(this.firestore, 'TerritorioRural', docId));
  }
  // ESTADÍSTICAS
  getStatisticsButtons(): Observable<StatisticsButton[]> {
    if (this._cachedStatistics()) {
      return of([this._cachedStatistics() as StatisticsButton]);
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

  async updateCardInCollection(
    collectionName: string,
    cardId: string,
    updatedData: Partial<Card>,
  ): Promise<void> {
    const cardRef = doc(this.firestore, collectionName, cardId);
    await updateDoc(cardRef, updatedData);
  }

  async deleteCardInCollection(collectionName: string, cardId: string): Promise<void> {
    const cardRef = doc(this.firestore, collectionName, cardId);
    await deleteDoc(cardRef);
  }

  async addCardInCollection(collectionName: string, cardData: Partial<Card>): Promise<void> {
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
  async postUser(user: User): Promise<void> {
    await setDoc(doc(this.firestore, 'users', user.user), user);
  }

  updateUser(user: string, dataUser: User): Observable<User> {
    const userRef = doc(this.firestore, 'users', user);
    void updateDoc(userRef, { ...dataUser });
    return docData(userRef) as Observable<User>;
  }
  deleteUser(user: string): void {
    void deleteDoc(doc(this.firestore, 'users', user));
  }
}
