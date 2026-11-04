import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TerritoryPageComponent } from './territory-page.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { CardService } from '@core/services/card.service';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { Component, Input } from '@angular/core';
import { provideRouter } from '@angular/router';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { CardSComponent } from '../../../../shared/components/card-s/card-s.component';

@Component({
  selector: 'app-card-xl',
  template: '',
  standalone: true,
})
class MockCardXlComponent {
  @Input() mapSRC: any;
  @Input() mapName: any;
  @Input() mapURL: any;
}

@Component({
  selector: 'app-card-s',
  template: '',
  standalone: true,
})
class MockCardSComponent {
  @Input() territoryNumber: any;
  @Input() active: any;
  @Input() routeLink: any;
}

describe('TerritoryPageComponent', () => {
  let component: TerritoryPageComponent;
  let fixture: ComponentFixture<TerritoryPageComponent>;
  let mockTerritoryDataService: any;
  let mockSpinnerService: any;
  let mockCardService: any;

  beforeEach(async () => {
    mockTerritoryDataService = {
      getMaps: vi
        .fn()
        .mockReturnValue(of([{ maps: [{ mapSRC: 'src', mapName: 'name', link: 'link' }] }])),
      getNumberTerritory: vi.fn().mockReturnValue(of([])),
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn(),
    };

    mockCardService = {};

    await TestBed.configureTestingModule({
      imports: [TerritoryPageComponent],
      providers: [
        provideRouter([]),
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: SpinnerService, useValue: mockSpinnerService },
        { provide: CardService, useValue: mockCardService },
      ],
    })
      .overrideComponent(TerritoryPageComponent, {
        remove: { imports: [CardXlComponent, CardSComponent] },
        add: { imports: [MockCardXlComponent, MockCardSComponent] },
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

  it('should create', () => {
    fixture = TestBed.createComponent(TerritoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should set isAdmin if tokenAdmin is in localStorage', () => {
    localStorage.setItem('tokenAdmin', 'true');
    fixture = TestBed.createComponent(TerritoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.isAdmin()).toBe(true);
    expect(component.isDriver()).toBe(true); // admins can also act as drivers
  });

  it('should set isDriver if tokenConductor is in localStorage', () => {
    localStorage.setItem('tokenConductor', 'true');
    fixture = TestBed.createComponent(TerritoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.isDriver()).toBe(true);
    expect(component.isAdmin()).toBe(false);
  });

  it('should fetch maps if not in sessionStorage', () => {
    fixture = TestBed.createComponent(TerritoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(mockSpinnerService.cargarSpinner).toHaveBeenCalled();
    expect(mockTerritoryDataService.getMaps).toHaveBeenCalled();
    expect(component.territorioMaps()).toHaveLength(1);
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
    expect(sessionStorage.getItem('territorioMaps')).toBeTruthy();
  });

  it('should load maps from sessionStorage if available', () => {
    sessionStorage.setItem(
      'territorioMaps',
      JSON.stringify([{ mapSRC: 'session', mapName: 'name', link: 'link' }]),
    );
    fixture = TestBed.createComponent(TerritoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(mockSpinnerService.cargarSpinner).not.toHaveBeenCalled();
    expect(mockTerritoryDataService.getMaps).not.toHaveBeenCalled();
    expect(component.territorioMaps()[0].mapSRC).toBe('session');
  });

  it('should group territories by locality on init', () => {
    mockTerritoryDataService.getNumberTerritory.mockReturnValue(
      of([
        { wheelwright: [{ collection: 'coll1', territorio: 1 }] },
        { rural: [{ collection: 'coll2', territorio: 2 }] },
      ]),
    );

    fixture = TestBed.createComponent(TerritoryPageComponent);
    component = fixture.componentInstance;
    component.localities = [
      {
        name: 'Wheelwright',
        key: 'wheelwright',
        territoryPrefix: 'Territorio',
        storageKey: 'stat_ww',
        hasNumberedTerritories: true,
      },
      {
        name: 'Rural',
        key: 'rural',
        territoryPrefix: 'Rural',
        storageKey: 'stat_ru',
        hasNumberedTerritories: true,
      },
    ];

    fixture.detectChanges();

    expect(component.localitiesWithTerritories()).toHaveLength(2);
    expect(component.localitiesWithTerritories()[0].key).toBe('wheelwright');
    expect(component.localitiesWithTerritories()[0].territories).toHaveLength(1);
  });

  it('should filter out localities without territories', () => {
    mockTerritoryDataService.getNumberTerritory.mockReturnValue(of([{ wheelwright: [] }]));

    fixture = TestBed.createComponent(TerritoryPageComponent);
    component = fixture.componentInstance;
    component.localities = [
      {
        name: 'Wheelwright',
        key: 'wheelwright',
        territoryPrefix: 'Territorio',
        storageKey: 'stat_ww',
        hasNumberedTerritories: true,
      },
    ];

    fixture.detectChanges();

    expect(component.localitiesWithTerritories()).toHaveLength(0);
  });
});
