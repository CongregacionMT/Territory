import { TestBed } from '@angular/core/testing';
import { CampaignService } from './campaign.service';
import {
  Firestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
} from '@angular/fire/firestore';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { environment } from '@environments/environment';

vi.mock('@environments/environment', () => ({
  environment: {
    localities: [],
    congregationKey: 'wheelwright',
    territoryPrefix: 'Territorio',
  },
}));

describe('CampaignService', () => {
  let service: CampaignService;
  let mockFirestore: any;

  beforeEach(() => {
    mockFirestore = {};
    TestBed.configureTestingModule({
      providers: [CampaignService, { provide: Firestore, useValue: mockFirestore }],
    });
    service = TestBed.inject(CampaignService);

    // reset mocks before each test
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get active campaign', async () => {
    vi.mocked(collection).mockReturnValue('campaignRef' as any);
    const mockQuery = 'mockQuery';
    vi.mocked(query).mockReturnValue(mockQuery as any);
    vi.mocked(getDocs).mockResolvedValue({
      empty: false,
      docs: [{ id: 'test-id', data: () => ({ name: 'Test Campaign' }) }],
    } as any);

    const result = await service.getActiveCampaign();

    expect(collection).toHaveBeenCalledWith(mockFirestore, 'campaigns');
    expect(query).toHaveBeenCalled();
    expect(getDocs).toHaveBeenCalledWith(mockQuery);
    expect(result).toEqual({ id: 'test-id', name: 'Test Campaign' });
  });

  it('should return null if no active campaign exists', async () => {
    vi.mocked(getDocs).mockResolvedValue({ empty: true } as any);
    const result = await service.getActiveCampaign();
    expect(result).toBeNull();
  });

  it('should get all territories from all localities', () => {
    const mockStorage = {
      wheelwright: [
        { territorio: 1, collection: 'w1' },
        { territorio: 2, collection: 'w2' },
      ],
    };
    window.sessionStorage.setItem('numberTerritory', JSON.stringify(mockStorage));

    // Temporarily override environment mock
    const originalLocalities = environment.localities;
    environment.localities = [{ key: 'wheelwright' }] as any;

    const result = service.getAllTerritoriesFromAllLocalities();

    expect(result.length).toBe(2);
    expect(result[0].collection).toBe('w1');
    expect(result[1].collection).toBe('w2');

    // restore
    environment.localities = originalLocalities;
    window.sessionStorage.setItem('numberTerritory', '{}');
  });

  it('should extract territory number correctly', () => {
    expect(service.extractTerritoryNumber('TerritorioMT-5')).toBe(5);
    expect(service.extractTerritoryNumber('Territorio-123')).toBe(123);
    expect(service.extractTerritoryNumber('NoNumber')).toBe(0);
  });

  it('should get inactive campaigns', async () => {
    vi.mocked(getDocs).mockResolvedValue({
      docs: [{ id: 'inactive1', data: () => ({ name: 'Old Campaign' }) }],
    } as any);

    const result = await service.getInactiveCampaigns();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('inactive1');
    expect(result[0].name).toBe('Old Campaign');
  });

  it('should get campaign stats', async () => {
    vi.mocked(doc).mockReturnValue('docRef' as any);
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => ({ stats: { global: { done: 10 } } }),
    } as any);

    const result = await service.getCampaignStats('camp1');
    expect(doc).toHaveBeenCalledWith(mockFirestore, 'campaigns', 'camp1');
    expect(result).toEqual({ global: { done: 10 } });
  });

  it('should return empty object if no stats exist', async () => {
    vi.mocked(doc).mockReturnValue('docRef' as any);
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => false,
    } as any);

    const result = await service.getCampaignStats('camp1');
    expect(result).toEqual({});
  });
});
