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

import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { environment } from '@environments/environment';
import { PdfService } from '@core/services/pdf.service';
import { StorageService } from '@core/services/storage.service';
import { TerritoryCardComponent } from '../../components/territory-card/territory-card.component';
import { parseFirebaseDate } from '@shared/utils/date-utils';
import { isCompletionEnd } from '@shared/utils/territory-completion.utils';

import { Card, CardApplesData } from '@core/models/Card';

const countCheckedApples = (card: Card): number =>
  (card.applesData ?? []).filter((apple) => apple.checked).length;

const isMeaningfulCard = (card: Card): boolean => {
  if ((card as unknown as { isReset?: boolean })?.isReset) return false;
  const hasDriver = !!card.driver && card.driver.trim() !== '';
  const isCampaignCard =
    !!card.id && (card.id.startsWith('PostCampaña') || card.id.startsWith('Campaña-undefined'));
  return (
    countCheckedApples(card) > 0 ||
    hasDriver ||
    (card.applesData?.length ?? 0) > 1 ||
    isCampaignCard
  );
};

/**
 * Picks the preferred card between two duplicates:
 * 1) the one with a completion end date, 2) the one with more checked apples,
 * 3) the one with the newer creation date.
 */
const pickPreferredCard = (existing: Card, card: Card, getCardDate: (card: Card) => Date): Card => {
  const existingCompleted = isCompletionEnd(String(existing.end || ''));
  const cardCompleted = isCompletionEnd(String(card.end || ''));
  if (existingCompleted !== cardCompleted) return cardCompleted ? card : existing;

  const existingChecked = countCheckedApples(existing);
  const cardChecked = countCheckedApples(card);
  if (existingChecked !== cardChecked) return cardChecked > existingChecked ? card : existing;

  try {
    return getCardDate(card).getTime() > getCardDate(existing).getTime() ? card : existing;
  } catch {
    return existing;
  }
};

/** Deduplicates entries by driver + start + end. */
const dedupeCards = (cards: Card[], getCardDate: (card: Card) => Date): Card[] => {
  const byKey = new Map<string, Card>();
  for (const card of cards) {
    const key = `${(card.driver || '').trim()}||${String(card.start || '')}||${String(card.end || '')}`;
    const existing = byKey.get(key);
    byKey.set(key, existing ? pickPreferredCard(existing, card, getCardDate) : card);
  }
  return Array.from(byKey.values());
};

/** Years from the current one down to the oldest card (ignoring invalid dates and years <= 2000). */
const computeAvailableYears = (
  territoryCards: Card[][],
  getCardDate: (card: Card) => Date,
): number[] => {
  const currentYear = new Date().getFullYear();
  let minYear = currentYear;
  for (const card of territoryCards.flat()) {
    const date = getCardDate(card);
    if (!date || Number.isNaN(date.getTime()) || date.getTime() <= 0) continue;
    const year = date.getFullYear();
    if (year > 2000 && year < minYear) minYear = year;
  }
  return Array.from({ length: currentYear - minYear + 1 }, (_, i) => currentYear - i);
};

const removeUndefined = (obj: unknown): unknown => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date || typeof (obj as { toDate?: unknown }).toDate === 'function') return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  const result: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj as Record<string, unknown>)) {
    if (val !== undefined) result[k] = removeUndefined(val);
  }
  return result;
};

const isMissingRequiredFields = (data: Partial<Card>): boolean =>
  !data.driver || data.driver.trim() === '' || !data.start || !isCompletionEnd(data.end);

const buildResetCard = (card: Partial<Card>): Partial<Card> & { isReset: boolean } => ({
  ...card,
  isReset: true,
  driver: '',
  start: '',
  end: '',
  comments: '',
  creation: new Date().toISOString(),
  isInitial: false,
  applesData: (card.applesData ?? []).map((a: CardApplesData) => ({ ...a, checked: false })),
});

@Component({
  selector: 'app-territory-assignment',
  templateUrl: './territory-assignment.component.html',
  styleUrls: ['./territory-assignment.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, FormsModule, TerritoryCardComponent],
})
export class TerritoryAssignmentComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly territoryDataService = inject(TerritoryDataService);
  private readonly http = inject(HttpClient);
  private readonly spinner = inject(SpinnerService);
  private readonly rutaActiva = inject(ActivatedRoute);
  private readonly document = inject<Document>(DOCUMENT);
  private readonly pdfService = inject(PdfService);
  private readonly storageService = inject(StorageService);

  territoryPath = signal<string>('');
  territoriesNumber = signal<TerritoryNumberData[]>([]);
  dataListFull = signal<Card[][]>([]);
  filterDataListFull = signal<Card[][]>([]);
  selectedValueFilter = signal<string>('1');
  availableYears = signal<number[]>([]);
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
    this.refreshData();

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

    const territories = this.territoriesNumber();

    if (!territories || territories.length === 0) {
      if (updateState) {
        this.spinner.cerrarSpinner();
      }
      return;
    }

    const requests = territories.map((territory: TerritoryNumberData) =>
      this.territoryDataService.getCardTerritorieRegisterTableOnce(territory.collection),
    );

    if (requests.length === 0) {
      if (updateState) {
        this.spinner.cerrarSpinner();
      }
      return;
    }

    Promise.all(requests)
      .then((results: Card[][]) => {
        const filteredResults = results.map((cardList: Card[]) =>
          dedupeCards((cardList ?? []).filter(isMeaningfulCard), (card) => this.getCardDate(card)),
        );

        if (updateState) {
          this.availableYears.set(
            computeAvailableYears(filteredResults, (card) => this.getCardDate(card)),
          );

          this.dataListFull.set(filteredResults);
          this.sortByDate(this.selectedValueFilter());
          this.spinner.cerrarSpinner();
          this.loadingData.set(true);
        }
      })
      .catch((err) => {
        console.error('Error fetching territory data:', err);
        if (updateState) {
          this.spinner.cerrarSpinner();
        }
      });
  }

  refreshData(): void {
    if (this.hasPendingChanges()) {
      if (
        !confirm(
          'Tenés cambios sin guardar. Si recargás la página, vas a perder esos cambios locales. ¿Querés continuar?',
        )
      ) {
        return;
      }
      // Limpiamos los cambios locales si decidió continuar
      this.pendingChanges.set({});
      this.pendingDeletes.set({});
      this.editingCardKey.set(null);
    }

    this.spinner.cargarSpinner();
    const currentPath = this.territoryPath();
    const storageKey = this.getStorageKeyByPath(currentPath);

    this.storageService.removeItem(storageKey);
    this.storageService.removeItem('numberTerritory');
    this.storageService.removeItemsByPrefix('statisticData');

    this.dataListFull.set([]);
    this.filterDataListFull.set([]);

    this.territoryDataService
      .getNumberTerritory()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (numbers: import('@core/models/TerritoryNumberData').TerritoriesNumberData[]) => {
          const mergedData = (numbers as unknown as Record<string, TerritoryNumberData[]>[]).reduce(
            (
              acc: Record<string, TerritoryNumberData[]>,
              curr: Record<string, TerritoryNumberData[]>,
            ) => {
              return { ...acc, ...curr };
            },
            {},
          );
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
        if (!dateStart || Number.isNaN(dateStart.getTime()) || dateStart.getTime() === 0)
          return false;

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

      let updatedApples = existing?.data?.applesData || card.applesData || [];
      if (isCompletionEnd(editData.end)) {
        updatedApples = updatedApples.map((a: CardApplesData) => ({ ...a, checked: true }));
      }

      return {
        ...pending,
        [key]: {
          collectionName,
          cardId: String(card.id),
          data: {
            ...existing?.data,
            driver: editData.driver,
            start: editData.start,
            end: editData.end || '',
            applesData: updatedApples,
          },
          ...(existing?.isNew && { isNew: true }),
        },
      };
    });

    let localApples = card.applesData || [];
    if (isCompletionEnd(editData.end)) {
      localApples = localApples.map((a) => ({ ...a, checked: true }));
    }

    const updatedCard = {
      ...card,
      driver: editData.driver,
      start: editData.start,
      end: editData.end || '',
      applesData: localApples,
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
    const today = new Date().toISOString().split('T')[0];

    const existingCards = this.dataListFull()[territoryIndex] || [];

    // Función segura para extraer manzanas sea Array o Firebase Object Map
    const getApples = (c: Card): CardApplesData[] => {
      if (!c.applesData) return [];
      if (Array.isArray(c.applesData)) return c.applesData;
      return Object.values(c.applesData);
    };

    // 1. Buscar la tarjeta maestra original que tenga más de 1 manzana real
    let cardWithApples = existingCards.find((c) => getApples(c).length > 1);

    // 2. Si falló, buscar alguna que tenga al menos 1 manzana y que NO sea 'Registro manual'
    if (!cardWithApples) {
      cardWithApples = existingCards.find((c) => {
        const apples = getApples(c);
        return apples.length > 0 && apples[0].name && apples[0].name !== 'Registro manual';
      });
    }

    // 3. Buscar la estructura base (location, link, etc)
    const referenceCard = existingCards.find((c) => c.location || c.link || c.numberTerritory);

    const baseCard = { ...referenceCard, ...cardWithApples };

    const newCard = new Card();
    Object.assign(newCard, baseCard);

    newCard.id = fakeId;
    newCard.driver = '';
    newCard.start = today;
    newCard.end = '';
    const maxCompleted = existingCards.reduce((max, c) => Math.max(max, c.completed || 0), 0);
    newCard.completed = maxCompleted;
    newCard.revision = false;
    newCard.revisionComplete = false;
    newCard.creation = new Date().toISOString();

    const finalApples = getApples(baseCard as Card);
    if (finalApples.length > 0 && finalApples[0].name !== 'Registro manual') {
      newCard.applesData = finalApples.map((a: CardApplesData) => ({
        name: a.name,
        checked: false,
      }));
    } else {
      newCard.applesData = [{ name: 'Registro manual', checked: false }];
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

  private async saveNewCard(collectionName: string, sanitizedData: Partial<Card>): Promise<void> {
    const cleanData = { ...sanitizedData };
    delete cleanData.id;
    cleanData.applesData ??= [{ name: 'Registro manual', checked: false }];

    if (!isCompletionEnd(cleanData.end)) {
      await this.territoryDataService.addCardInCollection(collectionName, cleanData);
      return;
    }

    cleanData.completed = (cleanData.completed || 0) + 1;
    cleanData.isInitial = false;
    await this.territoryDataService.addCardInCollection(collectionName, cleanData);
    await this.territoryDataService.addCardInCollection(collectionName, buildResetCard(cleanData));
  }

  async saveAllChanges(): Promise<void> {
    const changes = this.pendingChanges();
    const deletes = this.pendingDeletes();
    const totalCount = Object.keys(changes).length + Object.keys(deletes).length;

    if (totalCount === 0) return;

    if (!confirm(`¿Estás seguro? Esta acción modificará o eliminará ${totalCount} registro(s).`))
      return;

    // Validación estricta: ningún cambio puede tener campos vacíos
    if (Object.values(changes).some((change) => isMissingRequiredFields(change.data))) {
      alert(
        'No se puede guardar. Hay un registro pendiente que no tiene conductor, fecha de entrega o fecha de devolución. Por favor, completa todos los campos requeridos.',
      );
      return;
    }

    this.spinner.cargarSpinner();
    try {
      for (const key of Object.keys(deletes)) {
        const del = deletes[key];
        await this.territoryDataService.deleteCardInCollection(del.collectionName, del.cardId);
      }
      for (const key of Object.keys(changes)) {
        const change = changes[key];
        const { collectionName, cardId, data, isNew } = change;

        const sanitizedData = removeUndefined(data) as Card;

        if (isNew) {
          await this.saveNewCard(collectionName, sanitizedData);
        } else {
          const cleanUpdateData = { ...sanitizedData };
          delete cleanUpdateData.id;
          await this.territoryDataService.updateCardInCollection(
            collectionName,
            cardId,
            cleanUpdateData,
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

    this.refreshData();
  }
}
