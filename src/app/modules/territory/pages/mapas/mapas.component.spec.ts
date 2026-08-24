import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapasComponent } from './mapas.component';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { NetworkService } from '@core/services/network.service';
import { DialogService } from '@core/services/dialog.service';
import { ActivatedRoute } from '@angular/router';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { of } from 'rxjs';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-offline-map-viewer',
  template: '',
  standalone: true
})
class MockOfflineMapViewerComponent {
  @Input() kmlUrl: any;
  @Input() center: any;
  @Input() zoom: any;
}

@Component({
  selector: 'app-modal-form-rural',
  template: '',
  standalone: true
})
class MockModalFormRuralComponent {
  openModalCreation() {}
  openModalEdition(form: any) {}
}

vi.mock('@core/config/maps.config', () => ({
  mapConfig: {
    maps: {
      'test-map': { kmlUrl: 'http://test.com/map.kml', iframeHtml: '<iframe src="test"></iframe>' },
      'rural': { kmlUrl: 'http://test.com/rural.kml' }
    }
  }
}));

describe('MapasComponent', () => {
  let component: MapasComponent;
  let fixture: ComponentFixture<MapasComponent>;
  let mockTerritoryDataService: any;
  let mockSpinnerService: any;
  let mockNetworkService: any;
  let mockDialogService: any;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockTerritoryDataService = {
      getTerritorieRural: vi.fn().mockReturnValue(of([{ id: '1', road: 'Route 1' }])),
      deleteRoad: vi.fn().mockResolvedValue(true)
    };

    mockSpinnerService = {
      cargarSpinner: vi.fn(),
      cerrarSpinner: vi.fn()
    };

    mockNetworkService = {
      isOnline: vi.fn().mockReturnValue(true)
    };

    mockDialogService = {
      openDialog: vi.fn().mockReturnValue(of(true))
    };

    mockActivatedRoute = {
      snapshot: { url: [{ path: 'test-map' }] }
    };

    await TestBed.configureTestingModule({
      imports: [MapasComponent],
      providers: [
        { provide: TerritoryDataService, useValue: mockTerritoryDataService },
        { provide: SpinnerService, useValue: mockSpinnerService },
        { provide: NetworkService, useValue: mockNetworkService },
        { provide: DialogService, useValue: mockDialogService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    })
    .overrideComponent(MapasComponent, {
      remove: { imports: [] },
      add: { imports: [MockOfflineMapViewerComponent, MockModalFormRuralComponent] }
    })
    .compileComponents();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize and load map config', () => {
    fixture = TestBed.createComponent(MapasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    
    expect(component).toBeTruthy();
    expect(component.kmlUrl).toBe('http://test.com/map.kml');
    expect(component.mapa).toBeDefined();
    expect(mockTerritoryDataService.getTerritorieRural).not.toHaveBeenCalled();
  });

  it('should load rural data if path is rural', () => {
    mockActivatedRoute.snapshot.url[0].path = 'rural';
    localStorage.setItem('tokenAdmin', 'true');
    
    fixture = TestBed.createComponent(MapasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    
    expect(mockSpinnerService.cargarSpinner).toHaveBeenCalled();
    expect(mockTerritoryDataService.getTerritorieRural).toHaveBeenCalled();
    expect(component.dataRural.length).toBe(1);
    expect(component.showRural).toBe(true);
    expect(component.isAdmin).toBe(true);
    expect(mockSpinnerService.cerrarSpinner).toHaveBeenCalled();
    
    localStorage.removeItem('tokenAdmin');
  });

  it('should call deleteRoad when confirmed', () => {
    fixture = TestBed.createComponent(MapasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    
    component.deleteRoad('road-123');
    
    expect(mockDialogService.openDialog).toHaveBeenCalled();
    expect(mockTerritoryDataService.deleteRoad).toHaveBeenCalledWith('road-123');
  });

  it('should not call deleteRoad when dialog is cancelled', () => {
    mockDialogService.openDialog.mockReturnValue(of(false));
    fixture = TestBed.createComponent(MapasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    
    component.deleteRoad('road-123');
    
    expect(mockTerritoryDataService.deleteRoad).not.toHaveBeenCalled();
  });

  it('should not call deleteRoad if no id provided', () => {
    fixture = TestBed.createComponent(MapasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    
    component.deleteRoad(undefined);
    
    expect(mockDialogService.openDialog).not.toHaveBeenCalled();
  });

  it('should open modal for creation', () => {
    fixture = TestBed.createComponent(MapasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    
    // Mock viewChild
    const mockModal = { openModalCreation: vi.fn(), openModalEdition: vi.fn() } as any;
    vi.spyOn(component as any, 'modalFormRuralComponent').mockReturnValue(mockModal);
    
    component.openModal('creation');
    
    expect(mockModal.openModalCreation).toHaveBeenCalled();
  });

  it('should open modal for edition', () => {
    fixture = TestBed.createComponent(MapasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    
    const mockModal = { openModalCreation: vi.fn(), openModalEdition: vi.fn() } as any;
    vi.spyOn(component as any, 'modalFormRuralComponent').mockReturnValue(mockModal);
    
    const formData = { id: '1', road: 'Route 1' } as any;
    component.openModal('edition', formData);
    
    expect(mockModal.openModalEdition).toHaveBeenCalledWith(formData);
  });
});
