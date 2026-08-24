import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CampaignDetailComponent, CampaignData } from './campaign-detail.component';
import { CampaignService } from '@core/services/campaign.service';
import { SpinnerService } from '@core/services/spinner.service';
import { ActivatedRoute } from '@angular/router';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatePipe, NgClass } from '@angular/common';

describe('CampaignDetailComponent', () => {
  let component: CampaignDetailComponent;
  let fixture: ComponentFixture<CampaignDetailComponent>;
  let mockCampaignService: any;
  let mockSpinnerService: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockCampaignService = {
      getCampaignById: vi.fn().mockResolvedValue(null)
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn()
    };

    mockActivatedRoute = {
      snapshot: { paramMap: { get: vi.fn().mockReturnValue('camp-123') } }
    };

    await TestBed.configureTestingModule({
      imports: [CampaignDetailComponent],
      providers: [
        { provide: CampaignService, useValue: mockCampaignService },
        { provide: SpinnerService, useValue: mockSpinnerService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create and close spinner if no campaign data', async () => {
    fixture = TestBed.createComponent(CampaignDetailComponent);
    component = fixture.componentInstance;
    
    await component.ngOnInit();
    
    expect(component).toBeTruthy();
    expect(mockSpinnerService.cargarSpinner).toHaveBeenCalled();
    expect(mockCampaignService.getCampaignById).toHaveBeenCalledWith('camp-123');
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
    expect(component.campaign()).toEqual({} as any);
  });

  it('should load campaign data and stats successfully', async () => {
    const mockData: CampaignData = {
      id: 'camp-123',
      initialInvitations: 100,
      leftoverInvitations: '10',
      missingInvitations: 5,
      finalComments: 'Good',
      departuresInfo: { checkedCount: 20 },
      stats: {
        'CABA-Territorio-1': { percent: 100, total: 10, salidas: 2, done: 10 },
        'GBA-Territorio-2': { percent: 50, total: 20, salidas: 1, done: 10 }
      }
    };
    mockCampaignService.getCampaignById.mockResolvedValue(mockData);

    fixture = TestBed.createComponent(CampaignDetailComponent);
    component = fixture.componentInstance;
    
    await component.ngOnInit();
    
    expect(component.campaign()).toEqual(mockData);
    expect(component.initialInvitations).toBe(100);
    expect(component.leftoverInvitations).toBe('10');
    expect(component.missingInvitations).toBe(5);
    expect(component.finalComments).toBe('Good');
    expect(component.departuresCount).toBe(20);
    
    // Check calculations
    expect(component.territoriosCompletados).toBe(1);
    expect(component.salidasTotales).toBe(3);
    expect(component.manzanasCompletadas).toBe(20);
    expect(component.manzanasTotales).toBe(30);
    expect(component.territorioPercent).toBe(Math.round((20 / 30) * 100));
    
    // Check locality groups
    const groups = component.territoriosPorLocalidad();
    const otherGroup = groups.find(g => g.name === 'Otros Territorios');
    expect(otherGroup).toBeDefined();
    
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
  });
});
