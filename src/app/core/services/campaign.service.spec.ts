import { TestBed } from '@angular/core/testing';
import { CampaignService } from './campaign.service';
import { collection, getDocs, query, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { environment } from '@environments/environment';

vi.mock('@environments/environment', () => ({
  environment: {
    localities: [],
    congregationKey: 'wheelwright',
    territoryPrefix: 'Territorio',
  },
}));

import { FirestoreProviderService } from './firestore-provider.service';

describe('CampaignService', () => {
  let service: CampaignService;
  let mockFirestore: any;

  beforeEach(() => {
    mockFirestore = {};
    TestBed.configureTestingModule({
      providers: [
        CampaignService,
        {
          provide: FirestoreProviderService,
          useValue: { getFirestore: () => mockFirestore },
        },
      ],
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

    expect(result).toHaveLength(2);
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
    expect(result).toHaveLength(1);
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

  it('should end campaign and sanitize undefined values before updating firestore', async () => {
    vi.mocked(doc).mockReturnValue('docRef' as any);
    vi.mocked(updateDoc).mockResolvedValue(undefined);
    vi.spyOn(service, 'getAllTerritoriesFromAllLocalities').mockReturnValue([]);

    const departuresInfoWithUndefined: any = {
      checkedCount: 1,
      details: [
        {
          id: 'dep-1',
          date: '2026-10-01',
          checked: true,
          publishers: undefined,
        },
      ],
    };

    await service.endCampaign(
      'camp1',
      { global: { done: 5, total: 10, percent: 50 } },
      'algunas',
      departuresInfoWithUndefined,
      undefined,
      'Final remarks',
    );

    expect(doc).toHaveBeenCalledWith(mockFirestore, 'campaigns', 'camp1');
    expect(updateDoc).toHaveBeenCalled();

    const updatePayload = vi.mocked(updateDoc).mock.calls[0][1] as Record<string, any>;
    expect(updatePayload.active).toBe(false);
    expect(updatePayload.leftoverInvitations).toBe('algunas');
    expect(updatePayload.finalComments).toBe('Final remarks');
    expect(updatePayload.missingInvitations).toBeUndefined();
    expect('missingInvitations' in updatePayload).toBe(false);

    // Verify nested undefined inside departuresInfo.details is completely stripped
    expect(updatePayload.departuresInfo.details[0].id).toBe('dep-1');
    expect('publishers' in updatePayload.departuresInfo.details[0]).toBe(false);
  });
});
