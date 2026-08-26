import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { UserLocationService } from './user-location.service';

describe('UserLocationService', () => {
  let service: UserLocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserLocationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should handle destroy gracefully', () => {
    expect(() => service.destroy()).not.toThrow();
  });
});
