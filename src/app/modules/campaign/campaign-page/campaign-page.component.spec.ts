import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CampaignPageComponent } from './campaign-page.component';
import { CampaignService } from '@core/services/campaign.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Router } from '@angular/router';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';

describe('CampaignPageComponent', () => {
  let component: CampaignPageComponent;
  let fixture: ComponentFixture<CampaignPageComponent>;
  let mockCampaignService: any;
  let mockSpinnerService: any;
  let mockTerritoryDataService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockCampaignService = {
      getActiveCampaign: vi.fn().mockResolvedValue(null),
      getInactiveCampaigns: vi.fn().mockResolvedValue([]),
      getCampaignStats: vi.fn().mockResolvedValue({ global: { done: 10, total: 20 } }),
      startCampaign: vi.fn().mockResolvedValue({ id: 'new-camp' }),
      getCachedCampaign: vi.fn().mockReturnValue(null),
      endCampaign: vi.fn().mockResolvedValue(true)
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn()
    };

    mockTerritoryDataService = {
      getWeeklyDepartures: vi.fn().mockReturnValue(of([]))
    };

    mockRouter = {
      navigate: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CampaignPageComponent],
      providers: [
        { provide: CampaignService, useValue: mockCampaignService },
        { provide: SpinnerService, useValue: mockSpinnerService },
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: Router, useValue: mockRouter },
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create and load inactive campaigns if no active campaign', async () => {
    mockCampaignService.getInactiveCampaigns.mockResolvedValue([
      { id: '1', name: 'Camp 1', description: 'Desc 1', dateEnd: { seconds: 1700000000 } }
    ]);
    
    fixture = TestBed.createComponent(CampaignPageComponent);
    component = fixture.componentInstance;
    
    await component.ngOnInit();
    
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
      'Territorio-1': { percent: 100 }
    });
    
    fixture = TestBed.createComponent(CampaignPageComponent);
    component = fixture.componentInstance;
    
    await component.ngOnInit();
    
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
    expect(component.campaignInProgress()).toBe(true);
  });

  it('should not start campaign if form is invalid', async () => {
    fixture = TestBed.createComponent(CampaignPageComponent);
    component = fixture.componentInstance;
    
    component.campaignName.set('ab'); // invalid length
    component.campaignEnd.set('2023-12-31');
    
    await component.confirmStartCampaign();
    
    expect(component.nameInvalid()).toBe(true);
    expect(mockCampaignService.startCampaign).not.toHaveBeenCalled();
  });

  it('should open end campaign modal and filter departures', async () => {
    mockCampaignService.getActiveCampaign.mockResolvedValue({ 
      id: 'active-1', 
      dateInit: '2023-01-01', 
      dateEnd: '2023-12-31' 
    });
    
    mockTerritoryDataService.getWeeklyDepartures.mockReturnValue(of([
      { weekId: '2023-01-02', departure: [{ date: '2023-01-03', driver: 'Test' }] }
    ]));
    
    fixture = TestBed.createComponent(CampaignPageComponent);
    component = fixture.componentInstance;
    
    await component.openEndCampaignModal();
    
    expect(component.showEndCampaignModal()).toBe(true);
    expect(component.filteredDepartures().length).toBe(1);
    expect(component.filteredDepartures()[0].driver).toBe('Test');
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
    
    await component.confirmEndCampaign();
    
    expect(mockCampaignService.endCampaign).not.toHaveBeenCalled();
  });

  it('should confirm and end campaign', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockCampaignService.getCachedCampaign.mockReturnValue({ id: 'active-1', stats: {} });
    
    fixture = TestBed.createComponent(CampaignPageComponent);
    component = fixture.componentInstance;
    
    component.leftoverInvitations.set('pocas');
    component.finalEndDate.set('2023-12-31');
    component.filteredDepartures.set([{ id: '1', date: '2023-01-01', dateLabel: 'Lunes', driver: 'Test', checked: true, publishers: 2 }]);
    
    await component.confirmEndCampaign();
    
    expect(mockCampaignService.endCampaign).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/campaign', 'active-1']);
    expect(component.campaignInProgress()).toBe(false);
  });
});
