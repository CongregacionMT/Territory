import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { TERRITORY_COUNT } from '@shared/utils/territories.config';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { Campaign, CampaignStats, DeparturesInfo } from '@core/models/Campaign';
import { Card } from '@core/models/Card';

@Injectable({
  providedIn: 'root',
})
export class CampaignService {
  private firestore = inject(Firestore);

  async getActiveCampaign(): Promise<Campaign | null> {
    const q = query(
      collection(this.firestore, 'campaigns'),
      where('active', '==', true),
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      } as Campaign;
    }
    return null;
  }

  /**
   * Obtiene todos los territorios de todas las localidades configuradas
   */
  getAllTerritoriesFromAllLocalities(): TerritoryNumberData[] {
    const storedNumberTerritory = sessionStorage.getItem('numberTerritory');
    if (!storedNumberTerritory) return [];

    const numberTerritory = JSON.parse(storedNumberTerritory);
    let allTerritories: TerritoryNumberData[] = [];

    if (environment.localities && environment.localities.length > 0) {
      environment.localities.forEach((locality) => {
        if (numberTerritory[locality.key]) {
          allTerritories = [
            ...allTerritories,
            ...numberTerritory[locality.key],
          ];
        }
      });
    } else {
      // Fallback legacy
      allTerritories = numberTerritory[environment.congregationKey] || [];
    }

    return allTerritories;
  }

  async startCampaign(
    data: {
      name: string;
      description: string;
      dateEnd: any;
      initialInvitations?: number;
    },
    onProgress?: (current: number, total: number) => void,
  ) {
    const campaignRef = collection(this.firestore, 'campaigns');

    // Obtener TODOS los territorios de TODAS las localidades
    const allTerritories = this.getAllTerritoriesFromAllLocalities();
    const totalTerritories =
      allTerritories.length > 0 ? allTerritories.length : TERRITORY_COUNT;

    const campaignDoc = await addDoc(campaignRef, {
      name: data.name,
      description: data.description,
      dateEnd: Timestamp.fromDate(new Date(data.dateEnd)),
      dateInit: Timestamp.now(),
      active: true,
      initialInvitations: data.initialInvitations || 0,
      stats: {},
    });

    // Reportar inicio
    onProgress?.(0, totalTerritories);

    if (allTerritories.length > 0) {
      // Procesar de a uno para poder reportar progreso
      for (let i = 0; i < allTerritories.length; i++) {
        await this.resetTerritoryByCollection(
          allTerritories[i].collection,
          campaignDoc.id,
        );
        onProgress?.(i + 1, allTerritories.length);
      }
    } else {
      // Fallback para compatibilidad si no hay datos en sessionStorage
      for (let i = 0; i < TERRITORY_COUNT; i++) {
        await this.resetTerritory(i + 1, campaignDoc.id);
        onProgress?.(i + 1, TERRITORY_COUNT);
      }
    }

    await updateDoc(campaignDoc, {
      'stats.global': {
        done: 0,
        total: 0,
        percent: 0,
        completedTerritories: 0,
        totalTerritories: totalTerritories,
        progressHistory: [],
        lastUpdate: Timestamp.now(),
      },
    });

    // Leer campaña actualizada desde Firestore (ya con stats)
    const snap = await getDoc(campaignDoc);
    const campaignData = {
      id: campaignDoc.id,
      ...snap.data(),
      dateInit: snap.data()?.['dateInit'].toDate().toISOString(),
      dateEnd: snap.data()?.['dateEnd'].toDate().toISOString(),
    };

    // Guardar en cache local
    localStorage.setItem('activeCampaign', JSON.stringify(campaignData));

    return campaignData;
  }

  // Método legacy para compatibilidad
  async resetTerritory(territoryNumber: number, campaignId: string) {
    const collectionName = `${environment.territoryPrefix}-${territoryNumber}`;
    return this.resetTerritoryByCollection(collectionName, campaignId);
  }

  /**
   * Resetea un territorio específico por su nombre de colección
   */
  async resetTerritoryByCollection(collectionName: string, campaignId: string) {
    // Guard: evitar error de Firebase si la colección está vacía
    if (!collectionName?.trim()) {
      console.warn(
        '[CampaignService] resetTerritoryByCollection: collectionName vacío, saltando.',
      );
      return;
    }

    const colRef = collection(this.firestore, collectionName);

    // Tomar solo el último documento del territorio
    const q = query(colRef, orderBy('creation', 'desc'), limit(1));
    const snapshot = await getDocs(q);

    return Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        if (data && Array.isArray(data['applesData'])) {
          const resetApples = data['applesData'].map((apple: any) => ({
            ...apple,
            checked: false,
          }));

          const newVersion = {
            ...data,
            applesData: resetApples,
            completed: 0,
            revision: false,
            revisionComplete: false,
            creation: Timestamp.now(),
            campaignId,
          };

          // 🔥 ID personalizado
          const customId = `Campaña-${campaignId}-${Date.now()}`;
          const newDocRef = doc(this.firestore, collectionName, customId);
          await setDoc(newDocRef, newVersion);

          // 🔧 Inicializar stats con nombre unificado
          // Extraer número para mostrar en stats (ej: TerritorioMT-5 -> 5)
          const territoryNumber = this.extractTerritoryNumber(collectionName);
          const campaignRef = doc(this.firestore, 'campaigns', campaignId);

          // Usar collectionName como clave para evitar colisiones entre localidades con mismo número
          // Pero mantener formato legible para UI si es posible
          await updateDoc(campaignRef, {
            [`stats.${collectionName}`]: {
              done: 0,
              total: resetApples.length,
              percent: 0,
              salidas: 0,
              territoryNumber: territoryNumber,
            },
          });
        }
      }),
    );
  }

  extractTerritoryNumber(collectionName: string): number {
    const match = collectionName.match(/(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  }

  getCampaign(): Observable<Campaign[]> {
    const campaignRef = collection(this.firestore, 'campaigns');
    return collectionData(campaignRef, { idField: 'id' }) as Observable<
      Campaign[]
    >;
  }

  async updateCampaignStats(campaignId: string, card: Card) {
    if (!card.applesData) return;
    const total = card.applesData.length;
    const done = card.applesData.filter((a) => a.checked).length;
    const percent = Math.round((done / total) * 100);

    console.log('[CampaignService] updateCampaignStats:', {
      link: card.link,
      territory: card.territory,
      territoryNumber: card.territoryNumber,
      done,
      total,
      percent,
    });

    const campaignRef = doc(this.firestore, 'campaigns', campaignId);

    // Usar la colección completa (link) como clave si está disponible, sino fallback robusto
    // IMPORTANTE: Evitar usar el string "undefined" que a veces viene en card.territory
    let statKey = card.link;

    if (!statKey || statKey === 'undefined') {
      statKey =
        card.territory && card.territory !== 'undefined'
          ? card.territory
          : undefined;
    }

    if (!statKey) {
      statKey =
        card.location && card.territoryNumber
          ? `${card.location}-${card.territoryNumber}`
          : card.territoryNumber
            ? `Territorio ${card.territoryNumber}`
            : 'Territorio Desconocido';
    }

    console.log('[CampaignService] Using statKey:', statKey);

    // ✅ Actualizar solo los campos, no reemplazar el objeto entero
    try {
      await updateDoc(campaignRef, {
        [`stats.${statKey}.done`]: done,
        [`stats.${statKey}.total`]: total,
        [`stats.${statKey}.percent`]: percent,
      });
    } catch (e) {
      console.error('[CampaignService] Error updating stats:', e);
      // Fallback a formato antiguo si falla
      const fallbackKey = card.territoryNumber
        ? `Territorio ${card.territoryNumber}`
        : 'Territorio';
      await updateDoc(campaignRef, {
        [`stats.${fallbackKey}.done`]: done,
        [`stats.${fallbackKey}.total`]: total,
        [`stats.${fallbackKey}.percent`]: percent,
      });
    }

    // Recalcular global
    const snap = await getDoc(campaignRef);
    const stats = snap.data()?.['stats'] || {};

    // Filtrar claves que parecen territorios (excluir 'global')
    const territorios = Object.keys(stats)
      .filter((k) => k !== 'global')
      .map((k) => stats[k]);

    let globalDone = 0;
    let globalTotal = 0;
    let completedTerritories = 0;

    territorios.forEach((t: any) => {
      globalDone += t.done || 0;
      globalTotal += t.total || 0;
      if (t.percent === 100) completedTerritories++;
    });

    const globalPercent =
      globalTotal > 0 ? Math.round((globalDone / globalTotal) * 100) : 0;

    // Histórico de progreso
    const today = new Date().toISOString().split('T')[0];
    const progressEntry = { date: today, percent: globalPercent };

    const existingHistory = stats.global?.progressHistory || [];
    const lastEntry = existingHistory[existingHistory.length - 1];

    if (
      !lastEntry ||
      lastEntry.percent !== globalPercent ||
      lastEntry.date !== today
    ) {
      existingHistory.push(progressEntry);
    }

    // Guardar global
    await updateDoc(campaignRef, {
      'stats.global': {
        done: globalDone,
        total: globalTotal,
        percent: globalPercent,
        completedTerritories,
        totalTerritories: territorios.length,
        avgPerTerritory: Math.round(globalPercent / territorios.length),
        progressHistory: existingHistory,
        lastUpdate: Timestamp.now(),
      },
    });
  }

  async getCampaignStats(campaignId: string): Promise<any> {
    const campaignRef = doc(this.firestore, 'campaigns', campaignId);
    const snap = await getDoc(campaignRef);
    if (snap.exists()) {
      return snap.data()['stats'] || {};
    }
    return {};
  }

  async getCampaignById(id: string) {
    const ref = doc(this.firestore, 'campaigns', id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      id: snap.id,
      ...data,
      dateInit: data['dateInit']?.toDate
        ? data['dateInit'].toDate()
        : data['dateInit'],
      dateEnd: data['dateEnd']?.toDate
        ? data['dateEnd'].toDate()
        : data['dateEnd'],
      stats: data['stats'] || {},
    };
  }

  async endCampaign(
    campaignId: string,
    finalStats: any,
    leftoverInvitations?: string,
    departuresInfo?: DeparturesInfo,
    onProgress?: (current: number, total: number) => void,
  ) {
    const campaignDocRef = doc(this.firestore, 'campaigns', campaignId);

    const updateData: any = {
      active: false,
      dateEnd: Timestamp.now(),
      stats: finalStats,
    };

    if (leftoverInvitations) {
      updateData.leftoverInvitations = leftoverInvitations;
    }

    if (departuresInfo) {
      updateData.departuresInfo = departuresInfo;
    }

    await updateDoc(campaignDocRef, updateData);

    const allTerritories = this.getAllTerritoriesFromAllLocalities();

    // Fallback robusto: si sessionStorage no tiene datos (ej: se recargó la pestaña),
    // construir la lista de colecciones directamente desde environment
    let collectionsToReset: string[] = [];

    if (allTerritories.length > 0) {
      collectionsToReset = allTerritories
        .map((t) => t.collection)
        .filter((c) => !!c?.trim());
    }

    if (collectionsToReset.length === 0) {
      // Intentar leer también de localStorage como fallback
      const storedInLocal = localStorage.getItem('numberTerritory');
      if (storedInLocal) {
        try {
          const numberTerritory = JSON.parse(storedInLocal);
          if (environment.localities?.length > 0) {
            environment.localities.forEach((loc) => {
              if (numberTerritory[loc.key]) {
                const cols = (numberTerritory[loc.key] as any[])
                  .map((t: any) => t.collection)
                  .filter((c: string) => !!c?.trim());
                collectionsToReset.push(...cols);
              }
            });
          } else {
            const fallback = numberTerritory[environment.congregationKey] || [];
            collectionsToReset = fallback
              .map((t: any) => t.collection)
              .filter((c: string) => !!c?.trim());
          }
        } catch {
          console.warn(
            '[CampaignService] localStorage numberTerritory no parseable',
          );
        }
      }
    }

    // Último fallback: usar prefix legacy + números del 1 al TERRITORY_COUNT
    if (collectionsToReset.length === 0) {
      console.warn(
        '[CampaignService] Sin territorios en storage, usando fallback numérico',
      );
      for (let n = 1; n <= TERRITORY_COUNT; n++) {
        collectionsToReset.push(`${environment.territoryPrefix}-${n}`);
      }
    }

    console.log(
      '[CampaignService] Territorios a resetear:',
      collectionsToReset.length,
      collectionsToReset,
    );

    const total = Math.max(collectionsToReset.length, 1);
    onProgress?.(0, total);

    for (let i = 0; i < collectionsToReset.length; i++) {
      const col = collectionsToReset[i];
      if (!col?.trim()) {
        console.warn('[CampaignService] Saltando colección vacía en idx', i);
        onProgress?.(i + 1, total);
        continue;
      }
      try {
        await this.resetTerritoryAfterCampaignByCollection(col);
      } catch (err) {
        console.error(
          '[CampaignService] Error reseteando colección:',
          col,
          err,
        );
      }
      onProgress?.(i + 1, total);
    }

    await this.cleanupCampaignData(campaignId);

    localStorage.removeItem('activeCampaign');
  }

  getCachedCampaign() {
    const raw = localStorage.getItem('activeCampaign');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && parsed.id ? parsed : null;
    } catch {
      return null;
    }
  }

  async resetTerritoryAfterCampaign(territoryNumber: number) {
    const collectionName = `${environment.territoryPrefix}-${territoryNumber}`;
    return this.resetTerritoryAfterCampaignByCollection(collectionName);
  }

  async resetTerritoryAfterCampaignByCollection(collectionName: string) {
    // Guard: evitar error de Firebase si la colección está vacía
    if (!collectionName?.trim()) {
      console.warn(
        '[CampaignService] resetTerritoryAfterCampaignByCollection: collectionName vacío, saltando.',
      );
      return;
    }

    const colRef = collection(this.firestore, collectionName);

    // Tomar solo el último documento
    const q = query(colRef, orderBy('creation', 'desc'), limit(1));
    const snapshot = await getDocs(q);

    return Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        if (data && Array.isArray(data['applesData'])) {
          const resetApples = data['applesData'].map((apple: any) => ({
            ...apple,
            checked: false,
          }));

          const newVersion = {
            ...data,
            applesData: resetApples,
            completed: 0,
            revision: false,
            revisionComplete: false,
            creation: Timestamp.now(),
            campaignId: null,
          };

          // ID personalizado para diferenciarlo
          const customId = `PostCampaña-${Date.now()}`;
          const newDocRef = doc(this.firestore, collectionName, customId);
          await setDoc(newDocRef, newVersion);
        }
      }),
    );
  }

  async getInactiveCampaigns(): Promise<Campaign[]> {
    const q = query(
      collection(this.firestore, 'campaigns'),
      where('active', '==', false),
      orderBy('dateEnd', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Campaign,
    );
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    const q = query(
      collection(this.firestore, 'campaigns'),
      orderBy('dateInit', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Campaign,
    );
  }

  async cleanupCampaignData(campaignId: string) {
    const allTerritories = this.getAllTerritoriesFromAllLocalities();
    let collectionsToCheck: string[] = [];

    if (allTerritories.length > 0) {
      collectionsToCheck = allTerritories
        .map((t) => t.collection)
        .filter((c) => !!c?.trim());
    }

    // Fallback si storage está vacío
    if (collectionsToCheck.length === 0) {
      const storedInLocal = localStorage.getItem('numberTerritory');
      if (storedInLocal) {
        try {
          const numberTerritory = JSON.parse(storedInLocal);
          if (environment.localities?.length > 0) {
            environment.localities.forEach((loc) => {
              if (numberTerritory[loc.key]) {
                const cols = (numberTerritory[loc.key] as any[])
                  .map((t: any) => t.collection)
                  .filter((c: string) => !!c?.trim());
                collectionsToCheck.push(...cols);
              }
            });
          }
        } catch (e) {
          console.warn(
            '[CampaignService] cleanup error parsing local storage',
            e,
          );
        }
      }
    }

    // Último recurso: fallback numérico
    if (collectionsToCheck.length === 0) {
      for (let n = 1; n <= TERRITORY_COUNT; n++) {
        collectionsToCheck.push(`${environment.territoryPrefix}-${n}`);
      }
    }

    for (const collectionName of collectionsToCheck) {
      if (!collectionName?.trim()) continue;
      const colRef = collection(this.firestore, collectionName);

      const snapshot = await getDocs(colRef);

      const deletes = snapshot.docs
        .filter((d) => d.id.startsWith(`Campaña-${campaignId}`)) // 👈 match exacto
        .map((d) => deleteDoc(doc(this.firestore, collectionName, d.id)));

      if (deletes.length > 0) {
        await Promise.all(deletes);
        // console.log(`🗑️ Eliminados ${deletes.length} docs de ${collectionName}`);
      }
    }
  }
}
