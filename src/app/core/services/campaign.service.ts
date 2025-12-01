import { inject, Injectable } from '@angular/core';
import { addDoc, collection, collectionData, deleteDoc, doc, Firestore, getDoc, getDocs, limit, orderBy, query, setDoc, Timestamp, updateDoc, where } from '@angular/fire/firestore';
import { TERRITORY_COUNT } from '@shared/utils/territories.config';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';

@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  private firestore = inject(Firestore);

  async getActiveCampaign(): Promise<any | null> {
    const q = query(collection(this.firestore, 'campaigns'), where('active', '==', true));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
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
      environment.localities.forEach(locality => {
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

  async startCampaign(data: { name: string; description: string; dateEnd: any }) {
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
      stats: {}
    });

    if (allTerritories.length > 0) {
      // Usar la lista dinámica de territorios
      await Promise.all(
        allTerritories.map(territory => 
          this.resetTerritoryByCollection(territory.collection, campaignDoc.id)
        )
      );
    } else {
      // Fallback para compatibilidad si no hay datos en sessionStorage
      await Promise.all(
        Array.from({ length: TERRITORY_COUNT }, (_, i) =>
          this.resetTerritory(i + 1, campaignDoc.id)
        )
      );
    }

    await updateDoc(campaignDoc, {
      'stats.global': {
        done: 0,
        total: 0,
        percent: 0,
        completedTerritories: 0,
        totalTerritories: totalTerritories,
        progressHistory: [],
        lastUpdate: Timestamp.now()
      }
    });

    // Leer campaña actualizada desde Firestore (ya con stats)
    const snap = await getDoc(campaignDoc);
    const campaignData = {
      id: campaignDoc.id,
      ...snap.data(),
      dateInit: snap.data()?.['dateInit'].toDate().toISOString(),
      dateEnd: snap.data()?.['dateEnd'].toDate().toISOString()
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
    const colRef = collection(this.firestore, collectionName);

    // Tomar solo el último documento del territorio
    const q = query(colRef, orderBy('creation', 'desc'), limit(1));
    const snapshot = await getDocs(q);

    return Promise.all(snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      if (data && Array.isArray(data['applesData'])) {
        const resetApples = data['applesData'].map((apple: any) => ({
          ...apple,
          checked: false
        }));

        const newVersion = {
          ...data,
          applesData: resetApples,
          completed: 0,
          revision: false,
          revisionComplete: false,
          creation: Timestamp.now(),
          campaignId
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
            territoryNumber: territoryNumber
          }
        });
      }
    }));
  }
  
  extractTerritoryNumber(collectionName: string): number {
    const match = collectionName.match(/(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  }

  getCampaign(){
    const campaignRef = collection(this.firestore, 'campaigns');
    return collectionData(campaignRef, {idField: 'id'}) as Observable<any>;
  }
  
  async updateCampaignStats(campaignId: string, card: any) {
    const total = card.applesData.length;
    const done = card.applesData.filter((a: any) => a.checked).length;
    const percent = Math.round((done / total) * 100);

    const campaignRef = doc(this.firestore, 'campaigns', campaignId);
    
    // Usar la colección completa como clave si está disponible, sino fallback
    const statKey = card.collection || `Territorio ${card.numberTerritory}`;

    // ✅ Actualizar solo los campos, no reemplazar el objeto entero
    // Intentar actualizar usando la colección primero (nuevo formato)
    try {
      await updateDoc(campaignRef, {
        [`stats.${statKey}.done`]: done,
        [`stats.${statKey}.total`]: total,
        [`stats.${statKey}.percent`]: percent
      });
    } catch (e) {
      // Fallback a formato antiguo si falla
      await updateDoc(campaignRef, {
        [`stats.Territorio ${card.numberTerritory}.done`]: done,
        [`stats.Territorio ${card.numberTerritory}.total`]: total,
        [`stats.Territorio ${card.numberTerritory}.percent`]: percent
      });
    }

    // Recalcular global
    const snap = await getDoc(campaignRef);
    const stats = snap.data()?.['stats'] || {};
    
    // Filtrar claves que parecen territorios (excluir 'global')
    const territorios = Object.keys(stats)
      .filter(k => k !== 'global')
      .map(k => stats[k]);

    let globalDone = 0;
    let globalTotal = 0;
    let completedTerritories = 0;

    territorios.forEach((t: any) => {
      globalDone += t.done || 0;
      globalTotal += t.total || 0;
      if (t.percent === 100) completedTerritories++;
    });

    const globalPercent = globalTotal > 0 ? Math.round((globalDone / globalTotal) * 100) : 0;

    // Histórico de progreso
    const today = new Date().toISOString().split('T')[0];
    const progressEntry = { date: today, percent: globalPercent };

    const existingHistory = stats.global?.progressHistory || [];
    const lastEntry = existingHistory[existingHistory.length - 1];

    if (!lastEntry || lastEntry.percent !== globalPercent || lastEntry.date !== today) {
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
        lastUpdate: Timestamp.now()
      }
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
      dateInit: data['dateInit']?.toDate ? data['dateInit'].toDate() : data['dateInit'],
      dateEnd: data['dateEnd']?.toDate ? data['dateEnd'].toDate() : data['dateEnd'],
      stats: data['stats'] || {}
    };
  }

  async endCampaign(campaignId: string, finalStats: any) {
    const campaignDocRef = doc(this.firestore, 'campaigns', campaignId);

    await updateDoc(campaignDocRef, {
      active: false,
      dateEnd: Timestamp.now(),
      stats: finalStats
    });

    const allTerritories = this.getAllTerritoriesFromAllLocalities();
    
    if (allTerritories.length > 0) {
      await Promise.all(
        allTerritories.map(territory => 
          this.resetTerritoryAfterCampaignByCollection(territory.collection)
        )
      );
    } else {
      await Promise.all(
        Array.from({ length: TERRITORY_COUNT }, (_, i) =>
          this.resetTerritoryAfterCampaign(i + 1)
        )
      );
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
    const colRef = collection(this.firestore, collectionName);

    // Tomar solo el último documento
    const q = query(colRef, orderBy('creation', 'desc'), limit(1));
    const snapshot = await getDocs(q);

    return Promise.all(snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      if (data && Array.isArray(data['applesData'])) {
        const resetApples = data['applesData'].map((apple: any) => ({
          ...apple,
          checked: false
        }));

        const newVersion = {
          ...data,
          applesData: resetApples,
          completed: 0,
          revision: false,
          revisionComplete: false,
          creation: Timestamp.now(),
          campaignId: null
        };

        // ID personalizado para diferenciarlo
        const customId = `PostCampaña-${Date.now()}`;
        const newDocRef = doc(this.firestore, collectionName, customId);
        await setDoc(newDocRef, newVersion);
      }
    }));
  }
  
  async getInactiveCampaigns(): Promise<any[]> {
    const q = query(
      collection(this.firestore, 'campaigns'),
      where('active', '==', false),
      orderBy('dateEnd', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getAllCampaigns(): Promise<any[]> {
    const q = query(
      collection(this.firestore, 'campaigns'),
      orderBy('dateInit', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async cleanupCampaignData(campaignId: string) {
    const allTerritories = this.getAllTerritoriesFromAllLocalities();
    
    // Si no hay territorios cargados, usar fallback
    const collectionsToCheck = allTerritories.length > 0 
      ? allTerritories.map(t => t.collection)
      : Array.from({ length: TERRITORY_COUNT }, (_, i) => `${environment.territoryPrefix}-${i + 1}`);

    for (const collectionName of collectionsToCheck) {
      const colRef = collection(this.firestore, collectionName);

      const snapshot = await getDocs(colRef);

      const deletes = snapshot.docs
        .filter(d => d.id.startsWith(`Campaña-${campaignId}`)) // 👈 match exacto
        .map(d => deleteDoc(doc(this.firestore, collectionName, d.id)));

      if (deletes.length > 0) {
        await Promise.all(deletes);
        console.log(`🗑️ Eliminados ${deletes.length} docs de ${collectionName}`);
      }
    }
  }
}
