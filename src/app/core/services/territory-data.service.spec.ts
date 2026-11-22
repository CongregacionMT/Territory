import { TestBed } from '@angular/core/testing';
import { TerritoryDataService } from './territory-data.service';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  docData,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { SpinnerService } from './spinner.service';
import { CampaignService } from './campaign.service';
import { FirestoreProviderService } from './firestore-provider.service';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { getDocsFromServer } from 'firebase/firestore';
import { Card } from '@core/models/Card';

describe('TerritoryDataService', () => {
  let service: TerritoryDataService;
  let mockFirestore: any;
  let mockRouter: any;
  let mockSpinner: any;
  let mockCampaign: any;

  beforeEach(() => {
    mockFirestore = {};
    mockRouter = { navigate: vi.fn() };
    mockSpinner = { cargarSpinner: vi.fn(), cerrarSpinner: vi.fn() };
    mockCampaign = { getCachedCampaign: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        TerritoryDataService,
        { provide: Firestore, useValue: mockFirestore },
        { provide: FirestoreProviderService, useValue: { getFirestore: () => mockFirestore } },
        { provide: Router, useValue: mockRouter },
        { provide: SpinnerService, useValue: mockSpinner },
        { provide: CampaignService, useValue: mockCampaign },
      ],
    });
    service = TestBed.inject(TerritoryDataService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get Maps', async () => {
    vi.mocked(collection).mockReturnValue('mapRef' as any);
    vi.mocked(collectionData).mockReturnValue(of([{ id: '1', name: 'urbano' }]));

    await new Promise<void>((resolve) => {
      service.getMaps().subscribe((maps) => {
        expect(collection).toHaveBeenCalledWith(mockFirestore, 'MapsTerritory');
        expect(maps).toHaveLength(1);
        expect(maps[0].name).toBe('urbano');
        resolve();
      });
    });
  });

  it('should get Number Territory and cache it', async () => {
    const mockData = [{ wheelwright: [{ territorio: 1 }] }];
    vi.mocked(collection).mockReturnValue('numRef' as any);
    vi.mocked(collectionData).mockReturnValue(of(mockData));

    await new Promise<void>((resolve) => {
      service.getNumberTerritory().subscribe((data) => {
        expect(collection).toHaveBeenCalledWith(mockFirestore, 'NumberTerritory');
        expect(data).toEqual(mockData);

        // Should now be cached
        service.getNumberTerritory().subscribe((cachedData) => {
          expect(cachedData).toEqual([{ wheelwright: [{ territorio: 1 }] }]);
          // Collection should not be called again
          expect(collection).toHaveBeenCalledTimes(1);
          resolve();
        });
      });
    });
  });

  it('should get Card Assigned', async () => {
    vi.mocked(collectionData).mockReturnValue(of([{ id: 'card1' } as any]));

    await new Promise<void>((resolve) => {
      service.getCardAssigned().subscribe((cards) => {
        expect(collection).toHaveBeenCalledWith(mockFirestore, 'Assigned');
        expect(cards[0].id).toBe('card1');
        resolve();
      });
    });
  });

  it('should get Card Territorie with query and order', async () => {
    vi.mocked(collection).mockReturnValue('cardRef' as any);
    vi.mocked(query).mockReturnValue('queryRef' as any);
    vi.mocked(where).mockReturnValue('whereCondition' as any);
    vi.mocked(orderBy).mockReturnValue('orderCondition' as any);
    vi.mocked(collectionData).mockReturnValue(of([{ id: 'card1' } as any]));

    await new Promise<void>((resolve) => {
      service.getCardTerritorie('SomeCollection').subscribe((cards) => {
        expect(collection).toHaveBeenCalledWith(mockFirestore, 'SomeCollection');
        expect(query).toHaveBeenCalled();
        expect(collectionData).toHaveBeenCalledWith('queryRef', { idField: 'id' });
        expect(cards).toHaveLength(1);
        expect(cards[0].id).toBe('card1');
        resolve();
      });
    });
  });

  it('should get territory cards directly from the server', async () => {
    const serverCards = [{ id: 'card-1', end: '2026-10-28' }];
    vi.mocked(collection).mockReturnValue('cardRef' as any);
    vi.mocked(getDocsFromServer).mockResolvedValue({
      docs: serverCards.map(({ id, ...data }) => ({
        id,
        data: () => data,
      })),
    } as Awaited<ReturnType<typeof getDocsFromServer>>);

    await expect(service.getCardTerritorieFromServer('SomeCollection')).resolves.toEqual(
      serverCards,
    );
    expect(collection).toHaveBeenCalledWith(mockFirestore, 'SomeCollection');
    expect(getDocsFromServer).toHaveBeenCalledWith('cardRef');
  });

  it('should surface server read failures instead of returning cached cards', async () => {
    const error = new Error('Server unavailable');
    vi.mocked(collection).mockReturnValue('cardRef' as any);
    vi.mocked(getDocsFromServer).mockRejectedValue(error);

    await expect(service.getCardTerritorieFromServer('SomeCollection')).rejects.toBe(error);
  });

  describe('getRecentCardsFromServer', () => {
    const toSnapshot = (cards: { id: string; [key: string]: unknown }[]) =>
      ({
        docs: cards.map(({ id, ...data }) => ({ id, data: () => data })),
      }) as Awaited<ReturnType<typeof getDocsFromServer>>;

    beforeEach(() => {
      vi.mocked(collection).mockReturnValue('cardRef' as any);
      vi.mocked(query).mockReturnValue('recentQuery' as any);
      vi.mocked(getDocsFromServer).mockReset();
    });

    it('reads only the recent cards when one of them is a completion', async () => {
      vi.mocked(getDocsFromServer).mockResolvedValueOnce(
        toSnapshot([
          { id: 'reset', end: '0' },
          { id: 'done', end: '2026-10-28' },
        ]),
      );

      const cards = await service.getRecentCardsFromServer('SomeCollection', 10);

      expect(cards.map((card) => card.id)).toEqual(['reset', 'done']);
      expect(getDocsFromServer).toHaveBeenCalledTimes(1);
      expect(getDocsFromServer).toHaveBeenCalledWith('recentQuery');
    });

    it('falls back to the full collection when no recent card is a completion', async () => {
      vi.mocked(getDocsFromServer)
        .mockResolvedValueOnce(toSnapshot([{ id: 'reset', end: '0' }]))
        .mockResolvedValueOnce(
          toSnapshot([
            { id: 'reset', end: '0' },
            { id: 'old', end: '2026-01-10' },
          ]),
        );

      const cards = await service.getRecentCardsFromServer('SomeCollection', 10);

      expect(cards.map((card) => card.id)).toEqual(['reset', 'old']);
      expect(getDocsFromServer).toHaveBeenCalledTimes(2);
      expect(getDocsFromServer).toHaveBeenLastCalledWith('cardRef');
    });

    it('surfaces server failures', async () => {
      const error = new Error('offline');
      vi.mocked(getDocsFromServer).mockRejectedValue(error);

      await expect(service.getRecentCardsFromServer('SomeCollection')).rejects.toBe(error);
    });
  });

  describe('postCardTerritorie', () => {
    const inheritedResetCard = (checked: boolean[]): Card =>
      ({
        driver: 'Conductor',
        start: '2026-10-28',
        end: '2026-10-28',
        isReset: true,
        applesData: checked.map((isChecked, index) => ({ name: `${index}`, checked: isChecked })),
      }) as unknown as Card;

    const savedCards = (): Record<string, unknown>[] =>
      vi.mocked(addDoc).mock.calls.map((call) => call[1] as Record<string, unknown>);

    beforeEach(() => {
      vi.mocked(collection).mockReturnValue('cardRef' as any);
      vi.mocked(addDoc).mockResolvedValue({} as any);
      mockCampaign.getCachedCampaign.mockReturnValue(null);
    });

    it('clears the inherited reset flag on a completed card and keeps it on the blank card', async () => {
      await service.postCardTerritorie(inheritedResetCard([true, true]), 'TerritorioVE-1');

      const [completedCard, blankCard] = savedCards();
      expect(completedCard['isReset']).toBe(false);
      expect(completedCard['driver']).toBe('Conductor');
      expect(blankCard['isReset']).toBe(true);
      expect(blankCard['driver']).toBe('');
    });

    it('clears the inherited reset flag on a partial card', async () => {
      await service.postCardTerritorie(inheritedResetCard([true, false]), 'TerritorioVE-1');

      expect(savedCards()).toHaveLength(1);
      expect(savedCards()[0]['isReset']).toBe(false);
    });
  });

  it('should get territory groups', async () => {
    vi.mocked(doc).mockReturnValue('docRef' as any);
    vi.mocked(docData).mockReturnValue(of({ groupA: [1, 2, 3] }));

    await new Promise<void>((resolve) => {
      service.getTerritoryGroups().subscribe((groups) => {
        expect(doc).toHaveBeenCalledWith(mockFirestore, 'Settings', 'TerritoryGroups');
        expect(docData).toHaveBeenCalledWith('docRef');
        expect(groups).toEqual({ groupA: [1, 2, 3] });
        resolve();
      });
    });
  });

  it('should call deleteCardAssigned correctly', () => {
    vi.mocked(doc).mockReturnValue('docRef' as any);

    service.deleteCardAssigned({ id: '123' } as any);
    expect(doc).toHaveBeenCalledWith(mockFirestore, 'Assigned', '123');
    expect(deleteDoc).toHaveBeenCalledWith('docRef');
  });

  describe('saveWeeklyDepartureKeepingCardStatus', () => {
    const departure = (overrides: Record<string, unknown>) => ({
      driver: 'Ana',
      location: 'TerritorioW',
      territory: ['N°1'],
      date: '2026-11-10',
      maps: '',
      point: '',
      schedule: '18:30',
      color: 'info',
      group: 0,
      cardStatus: 'pending',
      ...overrides,
    });

    function mockTransaction(storedDepartures: unknown[] | null) {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => storedDepartures !== null,
          data: () => ({ departure: storedDepartures }),
        }),
        set: vi.fn(),
      };
      vi.mocked(doc).mockReturnValue('weekRef' as any);
      vi.mocked(runTransaction).mockImplementation(((_firestore: unknown, update: any) =>
        update(tx)) as any);
      return tx;
    }

    it('keeps a card review made elsewhere when the editor did not touch that status', async () => {
      const tx = mockTransaction([departure({ departureId: 'a', cardStatus: 'received' })]);

      const saved = await service.saveWeeklyDepartureKeepingCardStatus(
        {
          weekId: '2026-11-09',
          departure: [departure({ departureId: 'a', driver: 'Beto' })] as any,
        },
        { a: 'pending' },
      );

      expect(saved[0].cardStatus).toBe('received');
      expect(saved[0].driver).toBe('Beto');
      expect(tx.set).toHaveBeenCalledTimes(1);
    });

    it('lets the editor change a card status on purpose', async () => {
      mockTransaction([departure({ departureId: 'a', cardStatus: 'received' })]);

      const saved = await service.saveWeeklyDepartureKeepingCardStatus(
        {
          weekId: '2026-11-09',
          departure: [departure({ departureId: 'a', cardStatus: 'canceled' })] as any,
        },
        { a: 'pending' },
      );

      expect(saved[0].cardStatus).toBe('canceled');
    });

    it('writes brand new departures with an id even when the week does not exist yet', async () => {
      mockTransaction(null);

      const saved = await service.saveWeeklyDepartureKeepingCardStatus(
        { weekId: '2026-11-09', departure: [departure({})] as any },
        {},
      );

      expect(saved[0].departureId).toBeTruthy();
      expect(saved[0].cardStatus).toBe('pending');
    });

    it('rejects, so the caller never reports a false success', async () => {
      vi.mocked(doc).mockReturnValue('weekRef' as any);
      vi.mocked(runTransaction).mockRejectedValue(new Error('offline'));

      await expect(
        service.saveWeeklyDepartureKeepingCardStatus({ weekId: '2026-11-09', departure: [] }, {}),
      ).rejects.toThrow('offline');
    });
  });
});
