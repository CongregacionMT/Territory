import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TerritoryMapComponent } from './territory-map.component';
import { TerritoryMapService } from '../../services/territory-map.service';
import { NetworkService } from '@core/services/network.service';
import { ComponentRef } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@core/config/maps.config', () => ({
  mapConfig: {
    maps: {
      'test-collection': {
        kmlUrl: 'http://test.com/map.kml',
        iframeHtml: '<iframe></iframe>'
      }
    }
  }
}));

describe('TerritoryMapComponent', () => {
  let component: TerritoryMapComponent;
  let fixture: ComponentFixture<TerritoryMapComponent>;
  let componentRef: ComponentRef<TerritoryMapComponent>;
  let mockMapService: any;
  let mockNetworkService: any;

  beforeEach(async () => {
    mockMapService = {
      destroy: vi.fn(),
      loadMapsApi: vi.fn().mockResolvedValue(true),
      initMap: vi.fn().mockResolvedValue({}),
      loadKml: vi.fn().mockResolvedValue(true),
      trackUserLocation: vi.fn(),
      isMapLoaded: vi.fn().mockReturnValue(true),
      getHeading: vi.fn().mockReturnValue(0),
      setHeading: vi.fn(),
      centerOnUser: vi.fn(),
      createFallbackIframe: vi.fn()
    };

    mockNetworkService = {
      isOnline: vi.fn().mockReturnValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [TerritoryMapComponent],
      providers: [
        { provide: TerritoryMapService, useValue: mockMapService },
        { provide: NetworkService, useValue: mockNetworkService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TerritoryMapComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    
    // Set required inputs
    componentRef.setInput('collection', 'test-collection');
    componentRef.setInput('congregationKey', 'test-key');
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should initialize map successfully with KML', async () => {
    fixture.detectChanges(); // calls ngOnInit -> initMap
    
    // Wait for promises in initMap
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(mockMapService.loadMapsApi).toHaveBeenCalled();
    expect(mockMapService.initMap).toHaveBeenCalled();
    expect(mockMapService.loadKml).toHaveBeenCalled();
    expect(component.mapLoaded()).toBe(true);
  });

  it('should fallback to iframe when loadKml fails and network is online', async () => {
    mockMapService.loadMapsApi.mockRejectedValue(new Error('API Error'));
    fixture.detectChanges();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(component.useFallback()).toBe(true);
    expect(mockMapService.createFallbackIframe).toHaveBeenCalled();
  });

  it('should fallback to offline viewer when network is offline', async () => {
    mockNetworkService.isOnline.mockReturnValue(false);
    mockMapService.loadMapsApi.mockRejectedValue(new Error('Offline'));
    
    fixture.detectChanges();
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(component.useOfflineViewer()).toBe(true);
    expect(component.useFallback()).toBe(false);
  });
});
