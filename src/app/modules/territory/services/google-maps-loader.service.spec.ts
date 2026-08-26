import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { GoogleMapsLoaderService } from './google-maps-loader.service';

describe('GoogleMapsLoaderService', () => {
  let service: GoogleMapsLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoogleMapsLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should resolve immediately if google.maps is already defined', async () => {
    // Mock the global google object
    (window as unknown as { google: { maps: unknown } }).google = { maps: {} };

    await expect(service.loadMapsApi()).resolves.toBeUndefined();

    // Clean up
    delete (window as unknown as { google?: unknown }).google;
  });
});
