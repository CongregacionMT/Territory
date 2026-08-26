import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Component,
  OnInit,
  DOCUMENT,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { HttpClient } from '@angular/common/http';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, take } from 'rxjs';

import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { environment } from '@environments/environment';
import { PdfService } from '@core/services/pdf.service';
import { StorageService } from '@core/services/storage.service';
import { TerritoryCardComponent } from '../../components/territory-card/territory-card.component';
import { parseFirebaseDate } from '@shared/utils/date-utils';

import { Card } from '@core/models/Card';

@Component({
  selector: 'app-territory-assignment',
  templateUrl: './territory-assignment.component.html',
  styleUrls: ['./territory-assignment.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormsModule, TerritoryCardComponent],
})
export class TerritoryAssignmentComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private territoryDataService = inject(TerritoryDataService);
  private http = inject(HttpClient);
  private spinner = inject(SpinnerService);
  private rutaActiva = inject(ActivatedRoute);
  private document = inject<Document>(DOCUMENT);
  private pdfService = inject(PdfService);
  private storageService = inject(StorageService);

  territoryPath = signal<string>('');
  territoriesNumber = signal<TerritoryNumberData[]>([]);
  dataListFull = signal<Card[][]>([]);
  filterDataListFull = signal<Card[][]>([]);
  selectedValueFilter = signal<string>('1');
  appleCount = signal<number>(0);
  s13JPG = signal<ArrayBuffer | null>(null);
  loadingData = signal(false);
  territoryNumberOfLocalStorage = signal<Record<string, TerritoryNumberData[]>>({});
  congregationKey = environment.congregationKey;

  editingCardKey = signal<string | null>(null);
  pendingChanges = signal<{
    [compositeKey: string]: {
      collectionName: string;
      cardId: string;
      data: Partial<Card>;
      isNew?: boolean;
    };
  }>({});
  pendingDeletes = signal<{ [compositeKey: string]: { collectionName: string; cardId: string } }>(
    {},
  );

  hasPendingChanges = computed(
    () =>
      Object.keys(this.pendingChanges()).length > 0 ||
      Object.keys(this.pendingDeletes()).length > 0,
  );

  constructor() {
    this.territoryPath.set(this.rutaActiva.snapshot.url.join('/'));
  }

  private getStorageKeyByPath(path: string): string {
    const locality = environment.localities.find((loc) => loc.key === path);
    return locality?.storageKey || 'registerStatisticDataTerritorioMT';
  }

  ngOnInit(): void {
    const numberTerritory =
      this.storageService.getItem<Record<string, TerritoryNumberData[]>>('numberTerritory') || {};

    const currentPath = this.territoryPath();
    const storageKey = this.getStorageKeyByPath(currentPath);

    this.territoriesNumber.set(numberTerritory[currentPath] || []);

    const parsedData = this.storageService.getItem<Card[][]>(storageKey);
    if (parsedData) {
      this.dataListFull.set(parsedData);
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
  }

  private loadPDFImage(): void {
    const httpOptions = {
      responseType: 'arraybuffer' as const,
    };
    const jpgPath = this.document.location.origin + '/assets/documents/S-13_S_image.jpg';

    this.http
      .get(jpgPath, httpOptions)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (jpg) => this.s13JPG.set(jpg),
      });
  }

  private fetchDataForLocality(path: string, storageKey: string, updateState: boolean): void {
    if (updateState) {
      this.spinner.cargarSpinner();
    }

    const territoryData =
      this.storageService.getItem<Record<string, TerritoryNumberData[]>>('numberTerritory');
    if (!territoryData) {
      if (updateState) {
        this.spinner.cerrarSpinner();
      }
      return;
    }

    const territories = territoryData[path] || [];

    const requests = territories.map((territory: TerritoryNumberData) =>
      this.territoryDataService.getCardTerritorieRegisterTable(territory.collection).pipe(take(1)),
    );

    if (requests.length === 0) {
      if (updateState) {
        this.spinner.cerrarSpinner();
      }
      return;
    }

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results: Card[][]) => {
          const filteredResults = results.map((cardList: Card[]) => {
            if (!cardList) return [];
            return cardList.filter((card) => {
              let checkedAppleCount = 0;
              if (card.applesData) {
                checkedAppleCount = card.applesData.filter((apple) => apple.checked).length;
              }
              return (
                checkedAppleCount > 0 ||
                (card.id &&
                  (card.id.startsWith('PostCampaña') || card.id.startsWith('Campaña-undefined')))
              );
            });
          });

          this.storageService.setItem(storageKey, filteredResults);

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

    this.storageService.removeItem(storageKey);
    this.storageService.removeItem('numberTerritory');

    this.dataListFull.set([]);
    this.filterDataListFull.set([]);

    this.territoryDataService
      .getNumberTerritory()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (numbers: TerritoryNumberData[]) => {
          const mergedData = (numbers as unknown as Record<string, TerritoryNumberData[]>[]).reduce(
            (
              acc: Record<string, TerritoryNumberData[]>,
              curr: Record<string, TerritoryNumberData[]>,
            ) => {
              return { ...acc, ...curr };
            },
            {},
          );
          this.storageService.setItem('numberTerritory', mergedData);
          this.territoriesNumber.set(mergedData[currentPath] || []);
          this.fetchDataForLocality(currentPath, storageKey, true);
        },
        error: (err) => {
          console.error('Error refreshing territory mapping:', err);
          this.spinner.cerrarSpinner();
        },
      });
  }

  private getCardDate(card: Card): Date {
    if (card.start) return new Date(card.start);
    if (card.creation) return parseFirebaseDate(card.creation);
    return new Date(0);
  }

  sortByDate(value: string): void {
    const valueNumber = Number(value);
    const fullData = this.dataListFull();

    if (!fullData || fullData.length === 0) return;

    const filtered = fullData.map((territoryCards: Card[]) => {
      const filteredCards = territoryCards.filter((card: Card) => {
        const dateStart = this.getCardDate(card);
        if (!dateStart || isNaN(dateStart.getTime()) || dateStart.getTime() === 0) return false;

        if (valueNumber === 1) {
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return dateStart >= sixMonthsAgo;
        } else if (valueNumber === 2) {
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          return dateStart >= oneYearAgo;
        } else {
          return dateStart.getFullYear() === valueNumber;
        }
      });

      filteredCards.sort((a, b) => this.getCardDate(a).getTime() - this.getCardDate(b).getTime());
      return filteredCards;
    });

    this.filterDataListFull.set(filtered);
  }

  async downloadPDF(): Promise<void> {
    if (!this.s13JPG()) return;
    await this.pdfService.generateTerritoryAssignmentPDF(
      this.s13JPG() as ArrayBuffer,
      this.territoriesNumber(),
      this.filterDataListFull(),
      this.territoryPath(),
    );
  }

  getCompositeKey(collectionName: string, cardId: string): string {
    return `${collectionName}_${cardId}`;
  }

  startEdit(card: Card, collectionName: string): void {
    if (!card.id) return;
    const key = this.getCompositeKey(collectionName, card.id);
    this.editingCardKey.set(key);
  }

  cancelEdit(): void {
    this.editingCardKey.set(null);
  }

  applyEditLocally(
    card: Card,
    collectionName: string,
    editData: { driver?: string; start?: string; end?: string },
  ): void {
    if (!card.id) return;
    const key = this.getCompositeKey(collectionName, card.id);

    this.pendingChanges.update((pending) => {
      const existing = pending[key];
      return {
        ...pending,
        [key]: {
          collectionName,
          cardId: String(card.id),
          data: {
            ...(existing?.data || {}),
            driver: editData.driver,
            start: editData.start,
            end: editData.end || '0',
          },
          ...(existing?.isNew ? { isNew: true } : {}),
        },
      };
    });

    const updatedCard = {
      ...card,
      driver: editData.driver,
      start: editData.start,
      end: editData.end || '0',
    };

    this.dataListFull.update((lists) => {
      const newLists = [...lists];
      const colIndex = this.territoriesNumber().findIndex((t) => t.collection === collectionName);
      if (colIndex !== -1) {
        const cardIndex = newLists[colIndex].findIndex((c) => c.id === card.id);
        if (cardIndex !== -1) {
          const newList = [...newLists[colIndex]];
          newList[cardIndex] = updatedCard;
          newLists[colIndex] = newList;
        }
      }
      return newLists;
    });

    this.sortByDate(this.selectedValueFilter());
    this.editingCardKey.set(null);
  }

  addCard(collectionName: string, territoryIndex: number): void {
    const fakeId = `temp-${Date.now()}`;
    const newCard = new Card();
    newCard.id = fakeId;
    newCard.driver = '';
    const today = new Date().toISOString().split('T')[0];
    newCard.start = today;
    newCard.end = '0';

    const existingCards = this.dataListFull()[territoryIndex] || [];
    const cardWithApples = existingCards.find(
      (c) => Array.isArray(c.applesData) && c.applesData.length > 0,
    );
    if (cardWithApples) {
      newCard.applesData = cardWithApples.applesData.map((a) => ({ name: a.name, checked: true }));
    } else {
      newCard.applesData = [{ name: 'Registro manual', checked: true }];
    }

    const referenceCard = existingCards.find((c) => c.location || c.numberTerritory);
    if (referenceCard) {
      newCard.location = referenceCard.location;
      newCard.numberTerritory = referenceCard.numberTerritory;
      newCard.territoryNumber = referenceCard.territoryNumber;
      newCard.link = referenceCard.link;
    }

    const key = this.getCompositeKey(collectionName, fakeId);
    this.pendingChanges.update((pending) => ({
      ...pending,
      [key]: { collectionName, cardId: fakeId, data: { ...newCard }, isNew: true },
    }));

    const currentData = [...this.dataListFull()];
    if (!currentData[territoryIndex]) currentData[territoryIndex] = [];
    currentData[territoryIndex] = [...currentData[territoryIndex], newCard];
    this.dataListFull.set(currentData);
    this.sortByDate(this.selectedValueFilter());

    this.startEdit(newCard, collectionName);
  }

  markForDelete(card: Card, collectionName: string): void {
    if (!card.id) return;
    const key = this.getCompositeKey(collectionName, card.id);

    if (this.pendingChanges()[key]?.isNew) {
      this.pendingChanges.update((p) => {
        const copy = { ...p };
        delete copy[key];
        return copy;
      });
      const currentData = [...this.dataListFull()];
      for (let i = 0; i < currentData.length; i++) {
        currentData[i] = currentData[i].filter((c) => c.id !== card.id);
      }
      this.dataListFull.set(currentData);
      this.sortByDate(this.selectedValueFilter());
      if (this.editingCardKey() === key) this.cancelEdit();
      return;
    }

    this.pendingDeletes.update((deletes) => ({
      ...deletes,
      [key]: { collectionName, cardId: String(card.id) },
    }));

    if (this.editingCardKey() === key) this.cancelEdit();
  }

  cancelDelete(card: Card, collectionName: string): void {
    if (!card.id) return;
    const key = this.getCompositeKey(collectionName, card.id);
    this.pendingDeletes.update((deletes) => {
      const copy = { ...deletes };
      delete copy[key];
      return copy;
    });
  }

  async saveAllChanges(): Promise<void> {
    const changes = this.pendingChanges();
    const deletes = this.pendingDeletes();
    const totalCount = Object.keys(changes).length + Object.keys(deletes).length;

    if (totalCount === 0) return;

    if (!confirm(`¿Estás seguro? Esta acción modificará o eliminará ${totalCount} registro(s).`))
      return;

    this.spinner.cargarSpinner();
    try {
      for (const key of Object.keys(deletes)) {
        const del = deletes[key];
        await this.territoryDataService.deleteCardInCollection(del.collectionName, del.cardId);
      }
      for (const key of Object.keys(changes)) {
        const change = changes[key];
        const { collectionName, cardId, data, isNew } = change;

        const removeUndefined = (obj: unknown): unknown => {
          if (obj === null || typeof obj !== 'object') return obj;
          if (obj instanceof Date || typeof (obj as { toDate?: unknown }).toDate === 'function')
            return obj;
          if (Array.isArray(obj)) return obj.map(removeUndefined);
          const result: Record<string, unknown> = {};
          const objRecord = obj as Record<string, unknown>;
          for (const k of Object.keys(objRecord)) {
            const val = objRecord[k];
            if (val !== undefined) result[k] = removeUndefined(val);
          }
          return result;
        };
        const sanitizedData = removeUndefined(data);

        if (isNew) {
          const { id, ...cleanData } = sanitizedData as Card;
          if (!cleanData.applesData)
            cleanData.applesData = [{ name: 'Registro manual', checked: true }];
          await this.territoryDataService.addCardInCollection(collectionName, cleanData);
        } else {
          await this.territoryDataService.updateCardInCollection(
            collectionName,
            cardId,
            sanitizedData as Partial<Card>,
          );
        }
      }
      this.pendingChanges.set({});
      this.pendingDeletes.set({});
      this.refreshData();
    } catch (e) {
      console.error('Error saving records:', e);
      alert('Hubo un error al guardar los registros. Por favor, intenta de nuevo.');
      this.spinner.cerrarSpinner();
    }
  }

  discardAllChanges(): void {
    if (!confirm('¿Estás seguro de que deseas descartar todos los cambios pendientes?')) {
      return;
    }

    this.pendingChanges.set({});
    this.pendingDeletes.set({});
    this.editingCardKey.set(null);

    // Restaurar desde storage para revertir las modificaciones locales hechas por applyEditLocally
    const currentPath = this.territoryPath();
    const storageKey = this.getStorageKeyByPath(currentPath);
    const parsedData = this.storageService.getItem<Card[][]>(storageKey);

    if (parsedData) {
      this.dataListFull.set(parsedData);
      this.sortByDate(this.selectedValueFilter());
    } else {
      this.refreshData();
    }
  }
}
