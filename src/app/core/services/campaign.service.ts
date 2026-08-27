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
  writeBatch,
  documentId,
  WriteBatch,
} from '@angular/fire/firestore';
import { TERRITORY_COUNT } from '@shared/utils/territories.config';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { TerritoriesNumberData, TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { Campaign, CampaignStats, DeparturesInfo } from '@core/models/Campaign';
import { Card, CardApplesData } from '@core/models/Card';

@Injectable({
  providedIn: 'root',
})
export class CampaignService {
  private readonly firestore = inject(Firestore);

  async getActiveCampaign(): Promise<Campaign | null> {
    const q = query(collection(this.firestore, 'campaigns'), where('active', '==', true));
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

    const numberTerritory = JSON.parse(storedNumberTerritory) as TerritoriesNumberData;
    let allTerritories: TerritoryNumberData[] = [];

    if (environment.localities && environment.localities.length > 0) {
      environment.localities.forEach((locality) => {
        if (numberTerritory[locality.key]) {
          allTerritories = [...allTerritories, ...numberTerritory[locality.key]];
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
      dateEnd: string | number | Date;
      initialInvitations?: number;
    },
    onProgress?: (current: number, total: number) => void,
  ): Promise<{ id: string; [key: string]: unknown }> {
    const campaignRef = collection(this.firestore, 'campaigns');

    // Obtener TODOS los territorios de TODAS las localidades
    const allTerritories = this.getAllTerritoriesFromAllLocalities();
    const totalTerritories = allTerritories.length > 0 ? allTerritories.length : TERRITORY_COUNT;

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
        await this.resetTerritoryByCollection(allTerritories[i].collection, campaignDoc.id);
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
    const snapData = snap.data() || {};
    const campaignData: { id: string; [key: string]: unknown } = {
      id: campaignDoc.id,
      ...snapData,
      dateInit:
        snapData['dateInit'] && typeof (snapData['dateInit'] as Timestamp).toDate === 'function'
          ? (snapData['dateInit'] as Timestamp).toDate().toISOString()
          : '',
      dateEnd:
        snapData['dateEnd'] && typeof (snapData['dateEnd'] as Timestamp).toDate === 'function'
          ? (snapData['dateEnd'] as Timestamp).toDate().toISOString()
          : '',
    };

    // Guardar en cache local
    localStorage.setItem('activeCampaign', JSON.stringify(campaignData));

    return campaignData;
  }

  // Método legacy para compatibilidad
  async resetTerritory(territoryNumber: number, campaignId: string): Promise<void[] | undefined> {
    const collectionName = `${environment.territoryPrefix}-${territoryNumber}`;
    return this.resetTerritoryByCollection(collectionName, campaignId);
  }

  /**
   * Resetea un territorio específico por su nombre de colección
   */
  async resetTerritoryByCollection(
    collectionName: string,
    campaignId: string,
  ): Promise<void[] | undefined> {
    // Guard: evitar error de Firebase si la colección está vacía
    if (!collectionName?.trim()) {
      console.warn('[CampaignService] resetTerritoryByCollection: collectionName vacío, saltando.');
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
          const resetApples = (data['applesData'] as CardApplesData[]).map((apple) => ({
            ...apple,
            checked: false,
          }));

          const newVersion = {
            ...data,
            applesData: resetApples,
            completed: (data['completed'] as number) ?? 0,
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
    const parts = collectionName.split('-');
    const num = Number.parseInt(parts[parts.length - 1], 10);
    return Number.isNaN(num) ? 0 : num;
  }

  getCampaign(): Observable<Campaign[]> {
    const campaignRef = collection(this.firestore, 'campaigns');
    return collectionData(campaignRef, { idField: 'id' }) as Observable<Campaign[]>;
  }

  async updateCampaignStats(campaignId: string, card: Card): Promise<void> {
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
    const isValidString = (s: string | undefined): boolean => !!s && s !== 'undefined';

    let statKey = isValidString(card.link)
      ? card.link
      : isValidString(card.territory)
        ? card.territory
        : undefined;

    if (!statKey) {
      const loc = isValidString(card.location) ? card.location : '';
      const num = card.territoryNumber ? String(card.territoryNumber) : '';

      statKey = loc && num ? `${loc}-${num}` : num ? `Territorio ${num}` : 'Territorio Desconocido';
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
    const snapStats = (snap.data()?.['stats'] as Record<string, CampaignStats>) || {};

    // Filtrar claves que parecen territorios (excluir 'global')
    const territorios = Object.keys(snapStats)
      .filter((k) => k !== 'global')
      .map((k) => snapStats[k]);

    let globalDone = 0;
    let globalTotal = 0;
    let completedTerritories = 0;

    territorios.forEach((t) => {
      globalDone += t.done || 0;
      globalTotal += t.total || 0;
      if (t.percent === 100) completedTerritories++;
    });

    const globalPercent = globalTotal > 0 ? Math.round((globalDone / globalTotal) * 100) : 0;

    // Histórico de progreso
    const today = new Date().toISOString().split('T')[0];
    const progressEntry = { date: today, percent: globalPercent };

    const globalStats = snapStats['global'] as CampaignStats | undefined;
    const existingHistory = globalStats?.progressHistory || [];
    const lastEntry = existingHistory[existingHistory.length - 1];

    if (lastEntry?.percent !== globalPercent || lastEntry?.date !== today) {
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
        avgPerTerritory:
          territorios.length > 0 ? Math.round(globalPercent / territorios.length) : 0,
        progressHistory: existingHistory,
        lastUpdate: Timestamp.now(),
      },
    });
  }

  async getCampaignStats(campaignId: string): Promise<Record<string, CampaignStats>> {
    const campaignRef = doc(this.firestore, 'campaigns', campaignId);
    const snap = await getDoc(campaignRef);
    if (snap.exists()) {
      return (snap.data()['stats'] as Record<string, CampaignStats>) || {};
    }
    return {};
  }

  async getCampaignById(id: string): Promise<Campaign | null> {
    const ref = doc(this.firestore, 'campaigns', id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      id: snap.id,
      name: (data['name'] as string) || '',
      description: (data['description'] as string) || '',
      active: Boolean(data['active']),
      dateInit:
        data['dateInit'] && typeof (data['dateInit'] as Timestamp).toDate === 'function'
          ? (data['dateInit'] as Timestamp).toDate()
          : (data['dateInit'] as Date),
      dateEnd:
        data['dateEnd'] && typeof (data['dateEnd'] as Timestamp).toDate === 'function'
          ? (data['dateEnd'] as Timestamp).toDate()
          : (data['dateEnd'] as Date),
      stats: (data['stats'] as { global: CampaignStats; [key: string]: CampaignStats }) || {
        global: { done: 0, total: 0, percent: 0 },
      },
      initialInvitations: data['initialInvitations'] as number | undefined,
      leftoverInvitations: data['leftoverInvitations'] as Campaign['leftoverInvitations'],
      departuresInfo: data['departuresInfo'] as DeparturesInfo | undefined,
    };
  }

  async endCampaign(
    campaignId: string,
    finalStats: Record<string, CampaignStats>,
    leftoverInvitations?: string,
    departuresInfo?: DeparturesInfo,
    missingInvitations?: number | null,
    finalComments?: string,
    manualEndDate?: Date | Timestamp,
    onProgress?: (current: number, total: number) => void,
  ): Promise<void> {
    const campaignDocRef = doc(this.firestore, 'campaigns', campaignId);

    const updateData: Record<string, unknown> = {
      active: false,
      dateEnd: manualEndDate || Timestamp.now(),
      stats: finalStats,
      ...(leftoverInvitations && { leftoverInvitations }),
      ...(missingInvitations !== undefined &&
        missingInvitations !== null && { missingInvitations }),
      ...(departuresInfo && { departuresInfo }),
      ...(finalComments && { finalComments }),
    };

    await updateDoc(campaignDocRef, updateData);

    const allTerritories = this.getAllTerritoriesFromAllLocalities();

    // Fallback robusto: si sessionStorage no tiene datos (ej: se recargó la pestaña),
    // construir la lista de colecciones directamente desde environment
    let collectionsToReset: string[] = [];

    if (allTerritories.length > 0) {
      collectionsToReset = allTerritories.map((t) => t.collection).filter((c) => !!c?.trim());
    }

    if (collectionsToReset.length === 0) {
      // Intentar leer también de localStorage como fallback
      const storedInLocal = localStorage.getItem('numberTerritory');
      if (storedInLocal) {
        try {
          const numberTerritory = JSON.parse(storedInLocal) as TerritoriesNumberData;
          if (environment.localities && environment.localities.length > 0) {
            environment.localities.forEach((loc) => {
              if (numberTerritory[loc.key]) {
                const cols = numberTerritory[loc.key]
                  .map((t) => t.collection)
                  .filter((c) => !!c?.trim());
                collectionsToReset.push(...cols);
              }
            });
          } else {
            const fallback = numberTerritory[environment.congregationKey] || [];
            collectionsToReset = fallback.map((t) => t.collection).filter((c) => !!c?.trim());
          }
        } catch {
          console.warn('[CampaignService] localStorage numberTerritory no parseable');
        }
      }
    }

    // Último fallback: usar prefix legacy + números del 1 al TERRITORY_COUNT
    if (collectionsToReset.length === 0) {
      console.warn('[CampaignService] Sin territorios en storage, usando fallback numérico');
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

    // ✅ Optimización: Usar WriteBatch para agrupar todos los resets en una sola petición de escritura
    const batch = writeBatch(this.firestore);

    // Procesar lecturas en paralelo para mayor velocidad
    await Promise.all(
      collectionsToReset.map(async (col, i) => {
        if (!col?.trim()) return;
        try {
          await this.resetTerritoryAfterCampaignByCollection(col, batch);
        } catch (err) {
          console.error('[CampaignService] Error preparando reset para:', col, err);
        }
        onProgress?.(i + 1, total);
      }),
    );

    // Commit todos los resets de una sola vez
    await batch.commit();

    // Run cleanup in the background — do NOT await it.
    // Optimized cleanup: Now uses prefix query and batched deletes.
    this.cleanupCampaignData(campaignId).catch((err: unknown) =>
      console.warn('[CampaignService] Background cleanup failed:', err),
    );

    localStorage.removeItem('activeCampaign');
  }

  getCachedCampaign(): Campaign | null {
    const raw = localStorage.getItem('activeCampaign');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Campaign;
      return parsed?.id ? parsed : null;
    } catch {
      return null;
    }
  }

  async resetTerritoryAfterCampaign(territoryNumber: number): Promise<void> {
    const collectionName = `${environment.territoryPrefix}-${territoryNumber}`;
    return this.resetTerritoryAfterCampaignByCollection(collectionName);
  }

  async resetTerritoryAfterCampaignByCollection(
    collectionName: string,
    batch?: WriteBatch,
  ): Promise<void> {
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

    if (snapshot.empty) return;

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    if (data && Array.isArray(data['applesData'])) {
      const newVersion = {
        ...data,
        revision: false,
        revisionComplete: false,
        creation: Timestamp.now(),
        campaignId: null,
      };

      // ID personalizado para diferenciarlo
      const customId = `PostCampaña-${Date.now()}`;
      const newDocRef = doc(this.firestore, collectionName, customId);

      if (batch) {
        batch.set(newDocRef, newVersion);
      } else {
        await setDoc(newDocRef, newVersion);
      }
    }
  }

  async getInactiveCampaigns(): Promise<Campaign[]> {
    const q = query(
      collection(this.firestore, 'campaigns'),
      where('active', '==', false),
      orderBy('dateEnd', 'desc'),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as Campaign,
    );
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    const q = query(collection(this.firestore, 'campaigns'), orderBy('dateInit', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as Campaign,
    );
  }

  async cleanupCampaignData(campaignId: string): Promise<void> {
    const allTerritories = this.getAllTerritoriesFromAllLocalities();
    let collectionsToCheck: string[] = [];

    if (allTerritories.length > 0) {
      collectionsToCheck = allTerritories.map((t) => t.collection).filter((c) => !!c?.trim());
    }

    // Fallback si storage está vacío
    if (collectionsToCheck.length === 0) {
      const storedInLocal = localStorage.getItem('numberTerritory');
      if (storedInLocal) {
        try {
          const numberTerritory = JSON.parse(storedInLocal) as TerritoriesNumberData;
          if (environment.localities && environment.localities.length > 0) {
            environment.localities.forEach((loc) => {
              if (numberTerritory[loc.key]) {
                const cols = numberTerritory[loc.key]
                  .map((t) => t.collection)
                  .filter((c) => !!c?.trim());
                collectionsToCheck.push(...cols);
              }
            });
          }
        } catch (e) {
          console.warn('[CampaignService] cleanup error parsing local storage', e);
        }
      }
    }

    // Último recurso: fallback numérico
    if (collectionsToCheck.length === 0) {
      for (let n = 1; n <= TERRITORY_COUNT; n++) {
        collectionsToCheck.push(`${environment.territoryPrefix}-${n}`);
      }
    }

    const batch = writeBatch(this.firestore);
    let count = 0;

    // ✅ Optimización: Fetch en paralelo del cleanup usando queries de prefijo exacto (documentId)
    // Esto evita descargar TODA la colección por cada territorio.
    const prefix = `Campaña-${campaignId}`;

    await Promise.all(
      collectionsToCheck.map(async (collectionName) => {
        if (!collectionName?.trim()) return;
        const colRef = collection(this.firestore, collectionName);

        const snapshot = await getDocs(colRef);

        const deletes = snapshot.docs
          .filter((d) => d.id.startsWith(`Campaña-${campaignId}`)) // 👈 match exacto
          .filter((d) => {
            const data = d.data();
            const apples = (data['applesData'] as CardApplesData[]) || [];
            const hasActivity = apples.some((a) => a.checked === true);
            // Omitir el borrado si la tarjeta tiene actividad (fue completada)
            return !hasActivity;
          })
          .map((d) => deleteDoc(doc(this.firestore, collectionName, d.id)));

        if (deletes.length > 0) {
          await Promise.all(deletes);
          // console.log(`🗑️ Eliminados ${deletes.length} docs de ${collectionName}`);
        }
        // Query eficiente por ID del documento
        const q = query(
          colRef,
          where(documentId(), '>=', prefix),
          where(documentId(), '<', prefix + '\uf8ff'),
        );

        try {
          const prefixSnapshot = await getDocs(q);
          prefixSnapshot.docs.forEach((d) => {
            batch.delete(doc(this.firestore, collectionName, d.id));
            count++;
          });
        } catch (err) {
          console.error('[CampaignService] Cleanup error in', collectionName, err);
        }
      }),
    );

    if (count > 0) {
      console.log(`[CampaignService] Limpiando ${count} docs temporales...`);
      await batch.commit();
    }
  }
}
