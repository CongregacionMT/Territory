import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfflineMapViewerComponent } from './offline-map-viewer.component';
import { ComponentRef } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as L from 'leaflet';

// Mock Leaflet globally
vi.mock('leaflet', () => {
  return {
    map: vi.fn().mockReturnValue({
      remove: vi.fn(),
      fitBounds: vi.fn(),
      hasLayer: vi.fn(),
      addLayer: vi.fn(),
    }),
    tileLayer: vi.fn().mockReturnValue({
      addTo: vi.fn(),
    }),
    geoJSON: vi.fn().mockReturnValue({
      addTo: vi.fn(),
      getBounds: vi.fn().mockReturnValue({ isValid: () => true }),
    }),
    circleMarker: vi.fn().mockReturnValue({
      addTo: vi.fn(),
      setLatLng: vi.fn(),
    }),
    latLng: vi.fn(),
  };
});

describe('OfflineMapViewerComponent', () => {
  let component: OfflineMapViewerComponent;
  let fixture: ComponentFixture<OfflineMapViewerComponent>;
  let componentRef: ComponentRef<OfflineMapViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfflineMapViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OfflineMapViewerComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    // Set required input
    componentRef.setInput('kmlUrl', 'http://example.com/test.kml');

    // Mock fetch for loadKml
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<kml></kml>'),
    });
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should initialize map after view init', () => {
    fixture.detectChanges(); // triggers ngOnInit and ngAfterViewInit
    expect(L.map).toHaveBeenCalled();
    expect(L.tileLayer).toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    fixture.detectChanges(); // starts loadKml

    // wait for async fetch
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(component.error()).toContain('HTTP Error 404');
    expect(component.loading()).toBe(false);
  });
});
