import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, DOCUMENT, inject, signal, ChangeDetectionStrategy , DestroyRef} from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { HttpClient } from '@angular/common/http';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, forkJoin, take } from 'rxjs';

import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CardSComponent } from '../../../../shared/components/card-s/card-s.component';
import { DatePipe, NgClass } from '@angular/common';
import { environment } from '@environments/environment';
import { PdfService } from '@core/services/pdf.service';

import { Card, CardApplesData } from '@core/models/Card';

@Component({
  selector: 'app-territory-assignment',
  templateUrl: './territory-assignment.component.html',
  styleUrls: ['./territory-assignment.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule, FormsModule, DatePipe, NgClass],
})
export class TerritoryAssignmentComponent implements OnInit {
  private destroyRef = inject(DestroyRef);  
  private territoryDataService = inject(TerritoryDataService);
  private territorieDataService = inject(TerritoryDataService);
  private http = inject(HttpClient);
  private spinner = inject(SpinnerService);
  private rutaActiva = inject(ActivatedRoute);
  private document = inject<Document>(DOCUMENT);
  private pdfService = inject(PdfService);  
  
  territoryPath = signal<string>('');
  territoriesNumber = signal<TerritoryNumberData[]>([]);
  dataListFull = signal<Card[][]>([]);
  filterDataListFull = signal<Card[][]>([]);
  selectedValueFilter = signal<string>('1');
  appleCount = signal<number>(0);
  s13JPG = signal<ArrayBuffer | null>(null);
  loadingData = signal(false);
  territoryNumberOfLocalStorage = signal<any>({});
  congregationKey = environment.congregationKey;
  
  editingCardKey = signal<string | null>(null);
  editFormData = signal<{driver?: string, start?: string, end?: string}>({});
  pendingChanges = signal<{ [compositeKey: string]: { collectionName: string, cardId: string, data: Partial<Card>, isNew?: boolean } }>({});
  pendingDeletes = signal<{ [compositeKey: string]: { collectionName: string, cardId: string } }>({});

  constructor() {
    this.territoryPath.set(this.rutaActiva.snapshot.url.join('/'));  
  }

  private getTerritoryPrefix(path: string): string {
    const locality = environment.localities.find((loc) => loc.key === path);
    return locality?.territoryPrefix || 'TerritorioMT';
  }

  private getStorageKeyByPath(path: string): string {
    const locality = environment.localities.find((loc) => loc.key === path);
    return locality?.storageKey || 'registerStatisticDataTerritorioMT';
  }

  ngOnInit(): void {
    const storedNumberTerritory = sessionStorage.getItem('numberTerritory');
    const numberTerritory = storedNumberTerritory
      ? JSON.parse(storedNumberTerritory)
      : [];

    const currentPath = this.territoryPath();
    const storageKey = this.getStorageKeyByPath(currentPath);

    this.territoriesNumber.set(numberTerritory[currentPath] || []);

    const storedStatisticData = sessionStorage.getItem(storageKey);
    if (storedStatisticData) {
      const parsedData = JSON.parse(storedStatisticData);
      this.dataListFull.set(parsedData);
      // Solo cargar datos si el array no está vacío o tiene la longitud correcta
      if (parsedData.length > 0) {
        this.sortByDate(this.selectedValueFilter());
        this.loadingData.set(true);
      } else {
        this.fetchDataForLocality(currentPath, storageKey, true);
      }
    } else {
      this.fetchDataForLocality(currentPath, storageKey, true);
    }

    this.loadPDFImage();
    this.preCacheOtherLocalitiesIfNeeded();
  }

  private loadPDFImage(): void {
    const httpOptions = {
      responseType: 'arraybuffer' as 'arraybuffer',
    };
    const jpgPath =
      this.document.location.origin + '/assets/documents/S-13_S_image.jpg';

    this.http.get(jpgPath, httpOptions).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (jpg) => this.s13JPG.set(jpg),
    });
  }

  private fetchDataForLocality(
    path: string,
    storageKey: string,
    updateState: boolean,
  ): void {
    if (updateState) {
      this.spinner.cargarSpinner();
    }

    const storedNumberTerritory = sessionStorage.getItem('numberTerritory');
    if (!storedNumberTerritory) {
      if (updateState) {
        this.spinner.cerrarSpinner();
      }
      return;
    }

    const territoryData = JSON.parse(storedNumberTerritory);
    const territories = territoryData[path] || [];

    const requests = territories.map((territory: any) =>
      this.territorieDataService
        .getCardTerritorieRegisterTable(territory.collection)
        .pipe(take(1)),
    );

    if (requests.length === 0) {
      if (updateState) {
        this.spinner.cerrarSpinner();
      }
      return;
    }

    forkJoin(requests).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (results: any) => {
        // Mantenemos la estructura original de 'results' para que los índices correspondan
        // a 'territoriesNumber'. Filtramos individualmente cada lista de tarjetas.
        const filteredResults = results.map((cardList: Card[]) => {
          if (!cardList) return [];
          return cardList.filter((card) => {
            let checkedAppleCount = 0;
            if (card.applesData) {
              checkedAppleCount = card.applesData.filter(
                (apple) => apple.checked,
              ).length;
            }

            // Dejar pasar tarjetas con manzanas completadas O las tarjetas de inicio/cierre que actúan como hito.
            return checkedAppleCount > 0 || (card.id && (card.id.startsWith('PostCampaña') || card.id.startsWith('Campaña-undefined')));
          });
        });

        sessionStorage.setItem(storageKey, JSON.stringify(filteredResults));

        if (updateState) {
          this.dataListFull.set(filteredResults);
          this.sortByDate(this.selectedValueFilter());
          this.spinner.cerrarSpinner();
          this.loadingData.set(true);
        }
      },
      error: (err) => {
        console.error('Error fetching territory data:', err);
        if (updateState) {
          this.spinner.cerrarSpinner();
        }
      },
    });
  }

  refreshData(): void {
    this.spinner.cargarSpinner();
    const currentPath = this.territoryPath();
    const storageKey = this.getStorageKeyByPath(currentPath);

    // Limpiamos absolutamente todo lo relacionado con la caché de datos para forzar carga fresca
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem('numberTerritory');

    this.dataListFull.set([]);
    this.filterDataListFull.set([]);

    // Primero refrescamos el mapeo de territorios (números y colecciones)
    this.territorieDataService.getNumberTerritory().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (numbers: TerritoryNumberData[]) => {
        const mergedData = numbers.reduce((acc: any, curr: any) => {
          return { ...acc, ...curr };
        }, {});
        sessionStorage.setItem('numberTerritory', JSON.stringify(mergedData));

        // Actualizamos la lista de números localmente
        this.territoriesNumber.set(mergedData[currentPath] || []);

        // Ahora pedimos los datos específicos de las colecciones actualizadas
        this.fetchDataForLocality(currentPath, storageKey, true);
      },
      error: (err) => {
        console.error('Error refreshing territory mapping:', err);
        this.spinner.cerrarSpinner();
      },
    });
  }

  private preCacheOtherLocalitiesIfNeeded(): void {
    const allStorageKeys = environment.localities.map((loc) => loc.storageKey);

    // Si ya hay algo en el storage para alguna localidad, asumimos que el proceso ya ocurrió o está ocurriendo.
    // Solo pre-cacheamos si el storage está completamente vacío.
    if (allStorageKeys.every((key) => !sessionStorage.getItem(key))) {
      environment.localities.forEach(({ key, storageKey }) => {
        // No volver a pedir la que ya pedimos en ngOnInit
        if (key !== this.territoryPath()) {
          this.fetchDataForLocality(key, storageKey, false);
        }
      });
    }
  }

  private getCardDate(card: Card): Date {
    if (card.start) {
      return new Date(card.start);
    } else if (card.creation) {
      if (typeof (card.creation as any).toDate === 'function') {
        return (card.creation as any).toDate();
      } else if ((card.creation as any).seconds) {
        return new Date((card.creation as any).seconds * 1000);
      } else {
        return new Date(card.creation as any);
      }
    }
    return new Date(0); // fallback
  }

  sortByDate(value: string) {
    const valueNumber = Number(value);
    const fullData = this.dataListFull();

    if (!fullData || fullData.length === 0) return;

    const filtered = fullData.map((territoryCards: Card[]) => {
      const filteredCards = territoryCards.filter((card: Card) => {
        const dateStart = this.getCardDate(card);
        if (!dateStart || isNaN(dateStart.getTime()) || dateStart.getTime() === 0) return false;

        if (valueNumber === 1) {
          // Últimos 6 meses
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return dateStart >= sixMonthsAgo;
        } else if (valueNumber === 2) {
          // Último año
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          return dateStart >= oneYearAgo;
        } else {
          // Año específico
          return dateStart.getFullYear() === valueNumber;
        }
      });
      
      // Ordenar: las primeras son las más antiguas (ascendente)
      filteredCards.sort((a, b) => this.getCardDate(a).getTime() - this.getCardDate(b).getTime());
      
      return filteredCards;
    });

    this.filterDataListFull.set(filtered);
  }

  async downloadPDF() {
    if (!this.s13JPG()) return;

    await this.pdfService.generateTerritoryAssignmentPDF(
      this.s13JPG()!,
      this.territoriesNumber(),
      this.filterDataListFull(),
      this.territoryPath(),
    );
  }

  getCompositeKey(collectionName: string, cardId: string): string {
    return `${collectionName}_${cardId}`;
  }

  startEdit(card: Card, collectionName: string) {
    if (!card.id) return;
    const key = this.getCompositeKey(collectionName, card.id);
    this.editingCardKey.set(key);
    
    const existingPending = this.pendingChanges()[key];
    
    let startDate = '';
    if (existingPending?.data.start !== undefined) {
       startDate = existingPending.data.start;
    } else if (card.start) {
       startDate = new Date(card.start).toISOString().split('T')[0];
    } else if (card.creation) {
       let d: Date;
       const creationAny = card.creation as any;
       if (typeof creationAny?.toDate === 'function') d = creationAny.toDate();
       else if (creationAny?.seconds) d = new Date(creationAny.seconds * 1000);
       else d = new Date(card.creation as string | number);
       startDate = d.toISOString().split('T')[0];
    }
    
    let endDate = '';
    if (existingPending?.data.end !== undefined) {
       endDate = existingPending.data.end;
    } else if (card.end) {
       endDate = new Date(card.end).toISOString().split('T')[0];
    }
    
    this.editFormData.set({
      driver: existingPending?.data.driver !== undefined ? existingPending.data.driver : card.driver,
      start: startDate,
      end: endDate
    });
  }

  cancelEdit() {
    this.editingCardKey.set(null);
    this.editFormData.set({});
  }

  updateEditData(field: 'driver' | 'start' | 'end', value: string) {
    this.editFormData.update(data => ({ ...data, [field]: value }));
  }

  applyEditLocally(card: Card, collectionName: string) {
    if (!card.id) return;
    const key = this.getCompositeKey(collectionName, card.id);
    
    this.pendingChanges.update(pending => {
      const existing = pending[key];
      return {
        ...pending,
        [key]: {
          collectionName,
          cardId: card.id!,
          data: {
            ...(existing?.data || {}),
            driver: this.editFormData().driver,
            start: this.editFormData().start,
            end: this.editFormData().end
          },
          ...(existing?.isNew ? { isNew: true } : {})
        }
      };
    });
    
    card.driver = this.editFormData().driver;
    card.start = this.editFormData().start;
    card.end = this.editFormData().end;
    
    this.editingCardKey.set(null);
  }

  addCard(collectionName: string, territoryIndex: number) {
    const fakeId = `temp-${Date.now()}`;
    const newCard = new Card();
    newCard.id = fakeId;
    newCard.driver = '';
    const today = new Date().toISOString().split('T')[0];
    newCard.start = today;
    newCard.end = today;

    // Obtener las manzanas reales del territorio a partir de una card existente.
    // Si no se encuentran, usar un placeholder para que pase el filtro.
    const existingCards = this.dataListFull()[territoryIndex] || [];
    const cardWithApples = existingCards.find(c => Array.isArray(c.applesData) && c.applesData.length > 0);
    if (cardWithApples) {
      newCard.applesData = cardWithApples.applesData.map(a => ({ name: a.name, checked: true }));
    } else {
      newCard.applesData = [{ name: 'Registro manual', checked: true }];
    }

    // Copiar campos relevantes del territorio (location, numberTerritory, etc.)
    const referenceCard = existingCards.find(c => c.location || c.numberTerritory);
    if (referenceCard) {
      newCard.location = referenceCard.location;
      newCard.numberTerritory = referenceCard.numberTerritory;
      newCard.territoryNumber = referenceCard.territoryNumber;
      newCard.link = referenceCard.link;
    }
    
    const key = this.getCompositeKey(collectionName, fakeId);
    this.pendingChanges.update(pending => {
      return {
        ...pending,
        [key]: {
          collectionName,
          cardId: fakeId,
          data: { ...newCard },
          isNew: true
        }
      };
    });

    const currentData = [...this.dataListFull()];
    if (!currentData[territoryIndex]) currentData[territoryIndex] = [];
    currentData[territoryIndex] = [...currentData[territoryIndex], newCard];
    this.dataListFull.set(currentData);
    this.sortByDate(this.selectedValueFilter());
    
    this.startEdit(newCard, collectionName);
  }

  markForDelete(card: Card, collectionName: string) {
    if (!card.id) return;
    const key = this.getCompositeKey(collectionName, card.id);
    
    if (this.pendingChanges()[key]?.isNew) {
      this.pendingChanges.update(p => {
        const copy = {...p};
        delete copy[key];
        return copy;
      });
      const currentData = [...this.dataListFull()];
      for (let i = 0; i < currentData.length; i++) {
        currentData[i] = currentData[i].filter(c => c.id !== card.id);
      }
      this.dataListFull.set(currentData);
      this.sortByDate(this.selectedValueFilter());
      if (this.editingCardKey() === key) this.cancelEdit();
      return;
    }
    
    this.pendingDeletes.update(deletes => {
      return {
        ...deletes,
        [key]: { collectionName, cardId: card.id! }
      };
    });
    
    if (this.editingCardKey() === key) this.cancelEdit();
  }

  cancelDelete(card: Card, collectionName: string) {
    if (!card.id) return;
    const key = this.getCompositeKey(collectionName, card.id);
    this.pendingDeletes.update(deletes => {
      const copy = { ...deletes };
      delete copy[key];
      return copy;
    });
  }

  get hasPendingChanges(): boolean {
    return Object.keys(this.pendingChanges()).length > 0 || Object.keys(this.pendingDeletes()).length > 0;
  }

  async saveAllChanges() {
    const changes = this.pendingChanges();
    const deletes = this.pendingDeletes();
    const totalCount = Object.keys(changes).length + Object.keys(deletes).length;
    
    if (totalCount === 0) return;
    
    if (!confirm(`¿Estás seguro? Esta acción modificará o eliminará ${totalCount} registro(s) directamente en la base de datos.`)) {
      return;
    }

    this.spinner.cargarSpinner();
    try {
      for (const key of Object.keys(deletes)) {
        const { collectionName, cardId } = deletes[key];
        await this.territorieDataService.deleteCardInCollection(collectionName, cardId);
      }
      for (const key of Object.keys(changes)) {
        const { collectionName, cardId, data, isNew } = changes[key];
        
        // Remove undefined fields since Firestore doesn't support them
        const removeUndefined = (obj: any): any => {
          if (obj === null || typeof obj !== 'object') return obj;
          if (obj instanceof Date || (typeof obj.toDate === 'function')) return obj;
          if (Array.isArray(obj)) return obj.map(removeUndefined);
          const result: any = {};
          for (const k of Object.keys(obj)) {
            if (obj[k] !== undefined) {
              result[k] = removeUndefined(obj[k]);
            }
          }
          return result;
        };
        const sanitizedData = removeUndefined(data);

        if (isNew) {
           // Limpiar campos temporales antes de enviar a Firestore
           const { id, ...cleanData } = sanitizedData as Card;
           // Asegurar que applesData siempre esté presente
           if (!cleanData.applesData) {
             cleanData.applesData = [{ name: 'Registro manual', checked: true }];
           }
           await this.territorieDataService.addCardInCollection(collectionName, cleanData);
        } else {
           await this.territorieDataService.updateCardInCollection(collectionName, cardId, sanitizedData);
        }
      }
      this.pendingChanges.set({});
      this.pendingDeletes.set({});
      this.refreshData();
    } catch (e) {
      console.error("Error saving records:", e);
      alert("Hubo un error al guardar los registros. Por favor, intenta de nuevo.");
      this.spinner.cerrarSpinner();
    }
  }

  discardAllChanges() {
    if (!confirm('¿Estás seguro de que deseas descartar todos los cambios pendientes?')) {
      return;
    }
    
    this.pendingChanges.set({});
    this.pendingDeletes.set({});
    this.editingCardKey.set(null);
    
    // Restaurar desde sessionStorage para revertir las modificaciones locales hechas por applyEditLocally
    const currentPath = this.territoryPath();
    const storageKey = this.getStorageKeyByPath(currentPath);
    const storedStatisticData = sessionStorage.getItem(storageKey);
    
    if (storedStatisticData) {
      const parsedData = JSON.parse(storedStatisticData);
      this.dataListFull.set(parsedData);
      this.sortByDate(this.selectedValueFilter());
    } else {
      this.refreshData();
    }
  }
}
