import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardTerritoryComponent } from './card-territory.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { CardService } from '@core/services/card.service';
import { CampaignService } from '@core/services/campaign.service';
import { NetworkService } from '@core/services/network.service';
import { ActivatedRoute } from '@angular/router';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { Component, Input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { TerritoryMapComponent } from '../../components/territory-map/territory-map.component';
import { ModalComponent as ModalComponent_1 } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-territory-map',
  template: '',
  standalone: true,
})
class MockTerritoryMapComponent {
  @Input() path: any;
  @Input() collection: any;
  @Input() congregationKey: any;
}

@Component({
  selector: 'app-modal',
  template: '',
  standalone: true,
})
class MockModalComponent {
  @Input() idModal: any;
  @Input() titleModal: any;
  @Input() routeLink: any;
  @Input() width: any;
  openModal() {}
}

describe('CardTerritoryComponent', () => {
  let component: CardTerritoryComponent;
  let fixture: ComponentFixture<CardTerritoryComponent>;
  let mockTerritoryDataService: any;
  let mockCardService: any;
  let mockSpinnerService: any;
  let mockCampaignService: any;
  let mockNetworkService: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockTerritoryDataService = {
      getCardTerritorie: vi
        .fn()
        .mockReturnValue(of([{ applesData: [{ name: 'A1', checked: true }] }])),
      postCardTerritorie: vi.fn().mockResolvedValue(true),
      putCardTerritorie: vi.fn().mockResolvedValue(true),
      sendRevisionCardTerritorie: vi.fn().mockResolvedValue(true),
      getUsers: vi.fn().mockReturnValue(of([])),
    };

    mockCardService = {
      dataCard: { revision: false },
      rollbackCard: vi.fn(),
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn(),
    };

    mockCampaignService = {
      getCachedCampaign: vi.fn().mockReturnValue(null),
      updateCampaignStats: vi.fn(),
    };

    mockNetworkService = {
      isOnline: vi.fn().mockReturnValue(true),
    };

    mockActivatedRoute = {
      snapshot: { params: { collection: 'test-coll' } },
    };

    await TestBed.configureTestingModule({
      imports: [CardTerritoryComponent, ReactiveFormsModule, RouterTestingModule],
      providers: [
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: CardService, useValue: mockCardService },
        { provide: SpinnerService, useValue: mockSpinnerService },
        { provide: CampaignService, useValue: mockCampaignService },
        { provide: NetworkService, useValue: mockNetworkService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    })
      .overrideComponent(CardTerritoryComponent, {
        remove: { imports: [TerritoryMapComponent, ModalComponent_1] },
        add: { imports: [MockTerritoryMapComponent, MockModalComponent] },
      })
      .compileComponents();
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create and load new territory card', () => {
    fixture = TestBed.createComponent(CardTerritoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(mockSpinnerService.cargarSpinner).toHaveBeenCalled();
    expect(mockTerritoryDataService.getCardTerritorie).toHaveBeenCalledWith('test-coll');
    expect(component.card().applesData.length).toBe(1);
    expect(component.dataLoaded()).toBe(true);
  });

  it('should load card for revision if set in CardService', () => {
    mockCardService.dataCard = {
      revision: true,
      driver: 'Test Driver',
      start: '2023-01-01',
      end: '2023-01-02',
      comments: 'Test',
      applesData: [{ name: 'A1', checked: false }],
    };

    fixture = TestBed.createComponent(CardTerritoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.card().driver).toBe('Test Driver');
    expect(component.isRevisionMode()).toBe(true);
    expect(component.formCard().get('driver')?.value).toBe('Test Driver');
  });

  it('should handle offline mode by forcing spinner to close', () => {
    vi.useFakeTimers();
    mockNetworkService.isOnline.mockReturnValue(false);
    mockTerritoryDataService.getCardTerritorie.mockReturnValue(of()); // Doesn't emit anything

    fixture = TestBed.createComponent(CardTerritoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.dataLoaded()).toBe(false);

    vi.advanceTimersByTime(1500); // Trigger setTimeout

    expect(component.dataLoaded()).toBe(true);
    vi.useRealTimers();
  });

  it('should validate form and prevent submit if invalid', async () => {
    fixture = TestBed.createComponent(CardTerritoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Clear required driver field
    component.formCard().patchValue({ driver: '' });

    await component.submitForm();

    expect(component.driverError()).toBe(true);
    expect(mockTerritoryDataService.sendRevisionCardTerritorie).not.toHaveBeenCalled();
  });

  it('should update applesData on checkbox change', () => {
    fixture = TestBed.createComponent(CardTerritoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const event = { target: { value: 'A1', checked: false } };
    component.onCheckboxChange(event);

    const applesDataArray = component.formCard().get('applesData')?.value;
    expect(applesDataArray[0].checked).toBe(false);
  });

  it('should verify unique check', () => {
    fixture = TestBed.createComponent(CardTerritoryComponent);
    component = fixture.componentInstance;

    const duplicateApples = [
      { name: 'A1', checked: true },
      { name: 'A1', checked: false },
    ];

    const result = component.verifyUniqueCheck(duplicateApples);
    expect(result.length).toBe(1);
    expect(result[0].checked).toBe(true);
  });

  it('should submit new card', async () => {
    fixture = TestBed.createComponent(CardTerritoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    // Fill valid form
    component.formCard().patchValue({ driver: 'Test', start: '2023-01-01', end: '2023-01-02' });

    // Mock modalComponent to avoid error if viewChild is not resolved in test
    vi.spyOn(component, 'openModal').mockImplementation(() => {});

    await component.submitForm();

    expect(mockTerritoryDataService.sendRevisionCardTerritorie).toHaveBeenCalled();
  });

  it('should submit revised card', async () => {
    mockCardService.dataCard = {
      revision: true,
      driver: 'Test Driver',
      start: '2023-01-01',
      end: '2023-01-02',
      comments: 'Test',
      applesData: [{ name: 'A1', checked: false }],
    };

    fixture = TestBed.createComponent(CardTerritoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    await component.submitForm();

    expect(mockTerritoryDataService.postCardTerritorie).toHaveBeenCalled();
    expect(mockTerritoryDataService.putCardTerritorie).toHaveBeenCalled();
  });
});
