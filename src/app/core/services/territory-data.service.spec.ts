import { TestBed } from '@angular/core/testing';

import { TerritoryDataService } from './territory-data.service';

describe('TerritoryDataService', () => {
  let service: TerritoryDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TerritoryDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
