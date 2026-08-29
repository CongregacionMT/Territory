import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);

    // Mock sessionStorage
    let store: { [key: string]: string } = {};
    vi.spyOn(sessionStorage, 'getItem').mockImplementation((key: string) => store[key] || null);
    vi.spyOn(sessionStorage, 'setItem').mockImplementation((key: string, value: string) => {
      store[key] = value.toString();
    });
    vi.spyOn(sessionStorage, 'removeItem').mockImplementation((key: string) => {
      delete store[key];
    });
    vi.spyOn(sessionStorage, 'clear').mockImplementation(() => {
      store = {};
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set and get an item', () => {
    const key = 'testKey';
    const value = { prop: 'value' };

    service.setItem(key, value);
    const retrievedValue = service.getItem<{ prop: string }>(key);

    expect(retrievedValue).toEqual(value);

    expect(sessionStorage.setItem).toHaveBeenCalledWith(key, JSON.stringify(value));

    expect(sessionStorage.getItem).toHaveBeenCalledWith(key);
  });

  it('should remove an item', () => {
    const key = 'testKey';
    service.setItem(key, 'value');
    service.removeItem(key);

    expect(service.getItem(key)).toBeNull();

    expect(sessionStorage.removeItem).toHaveBeenCalledWith(key);
  });

  it('should clear storage', () => {
    service.setItem('key1', 'value1');
    service.setItem('key2', 'value2');
    service.clear();

    expect(service.getItem('key1')).toBeNull();
    expect(service.getItem('key2')).toBeNull();

    expect(sessionStorage.clear).toHaveBeenCalled();
  });

  it('should handle JSON parse errors gracefully', () => {
    const key = 'badJson';

    vi.mocked(sessionStorage.getItem).mockReturnValue('{bad json');

    vi.spyOn(console, 'error').mockImplementation(() => undefined); // Prevent error log from cluttering test output

    const result = service.getItem(key);

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});
