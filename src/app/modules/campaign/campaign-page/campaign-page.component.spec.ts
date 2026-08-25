import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CampaignPageComponent } from './campaign-page.component';
import { CampaignService } from '@core/services/campaign.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Router } from '@angular/router';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { of } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';

describe('CampaignPageComponent', () => {
  let component: CampaignPageComponent;
  let fixture: ComponentFixture<CampaignPageComponent>;
  let mockCampaignService: {
    getActiveCampaign: Mock;
    getInactiveCampaigns: Mock;
    getCampaignStats: Mock;
    startCampaign: Mock;
    getCachedCampaign: Mock;
    endCampaign: Mock;
  };
  let mockSpinnerService: { cargarSpinner: Mock; cerrarSpinner: Mock };
  let mockTerritoryDataService: { getWeeklyDepartures: Mock };
  let mockRouter: { navigate: Mock };

  beforeEach(async () => {
    mockCampaignService = {
      getActiveCampaign: vi.fn().mockResolvedValue(null),
      getInactiveCampaigns: vi.fn().mockResolvedValue([]),
      getCampaignStats: vi.fn().mockResolvedValue({ global: { done: 10, total: 20 } }),
      startCampaign: vi.fn().mockResolvedValue({ id: 'new-camp' }),
      getCachedCampaign: vi.fn().mockReturnValue(null),
      endCampaign: vi.fn().mockResolvedValue(true),
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn(),
    };

    mockTerritoryDataService = {
      getWeeklyDepartures: vi.fn().mockReturnValue(of([])),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CampaignPageComponent],
      providers: [
        { provide: CampaignService, useValue: mockCampaignService },
        { provide: SpinnerService, useValue: mockSpinnerService },
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: Router, useValue: mockRouter },
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create and load inactive campaigns if no active campaign', async () => {
    mockCampaignService.getInactiveCampaigns.mockResolvedValue([
      { id: '1', name: 'Camp 1', description: 'Desc 1', dateEnd: { seconds: 1700000000 } },
    ]);

    fixture = TestBed.createComponent(CampaignPageComponent);
    component = fixture.componentInstance;

    component.ngOnInit();
    await component.loadData();

    expect(component).toBeTruthy();
    expect(mockSpinnerService.cargarSpinner).toHaveBeenCalled();
    expect(component.campaignInProgress()).toBe(false);
    expect(component.campaignHistory().length).toBe(1);
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
  });

  it('should load active campaign and stats', async () => {
    mockCampaignService.getActiveCampaign.mockResolvedValue({ id: 'active-1' });
    mockCampaignService.getCampaignStats.mockResolvedValue({
      global: { done: 5, total: 10 },
      'Territorio-1': { percent: 100 },
    });

    fixture = TestBed.createComponent(CampaignPageComponent);
    component = fixture.componentInstance;

    component.ngOnInit();
    await component.loadData();

    expect(component.campaignInProgress()).toBe(true);
    expect(component.statsGlobal).toEqual({ done: 5, total: 10 });
    expect(component.territoriosPorLocalidad().length).toBeGreaterThan(0);
  });

  it('should validate form fields on change', () => {
    fixture = TestBed.createComponent(CampaignPageComponent);
    component = fixture.componentInstance;

    component.onNameChange('ab');
    expect(component.nameInvalid()).toBe(true);

    component.onNameChange('abcd');
    expect(component.nameInvalid()).toBe(false);

    component.onDateChange('');
    expect(component.dateInvalid()).toBe(true);

    component.onDateChange('2023-12-31');
    expect(component.dateInvalid()).toBe(false);
  });

  it('should start campaign if form is valid', async () => {
    fixture = TestBed.createComponent(CampaignPageComponent);
    component = fixture.componentInstance;

    component.campaignName.set('Test Campaign');
    component.campaignEnd.set('2023-12-31');

    await component.confirmStartCampaign();

    expect(mockCampaignService.startCampaign).toHaveBeenCalled();
  });

  it('should not start campaign if form is invalid', () => {
    fixture = TestBed.createComponent(CampaignPageComponent);
    component = fixture.componentInstance;

    component.campaignName.set('ab'); // invalid length
    component.campaignEnd.set('2023-12-31');

    component.openStartModal();

    expect(component.nameInvalid()).toBe(true);
  });

  it('should navigate to campaign detail', () => {
    fixture = TestBed.createComponent(CampaignPageComponent);
    component = fixture.componentInstance;

    component.goToCampaignDetail('123');

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/campaign', '123']);
  });

  it('should not confirm end campaign if user cancels prompt', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    fixture = TestBed.createComponent(CampaignPageComponent);
    component = fixture.componentInstance;
    await component.handleEndCampaign({
      leftoverInvitations: 'pocas',
      departuresInfo: { checkedCount: 1 },
      missingInvitations: 0,
      finalComments: '',
      finalEndDate: '2023-12-31',
    });

    expect(mockCampaignService.endCampaign).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/campaign', 'active-1']);
    expect(component.campaignInProgress()).toBe(false);
  });
});
