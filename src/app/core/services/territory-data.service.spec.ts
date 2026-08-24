import { TestBed } from '@angular/core/testing';
import { TerritoryDataService } from './territory-data.service';
import { Firestore, collection, collectionData, doc, docData, deleteDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { SpinnerService } from './spinner.service';
import { CampaignService } from './campaign.service';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';


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
        expect(maps.length).toBe(1);
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

  it('should call deleteCardAssigned correctly', () => {
    vi.mocked(doc).mockReturnValue('docRef' as any);

    service.deleteCardAssigned({ id: '123' } as any);
    expect(doc).toHaveBeenCalledWith(mockFirestore, 'Assigned', '123');
    expect(deleteDoc).toHaveBeenCalledWith('docRef');
  });

});
