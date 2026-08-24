import { TestBed } from '@angular/core/testing';
import { CardService } from './card.service';
import { Router } from '@angular/router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Card } from '@core/models/Card';

describe('CardService', () => {
  let service: CardService;
  let mockRouter: any;

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn()
    };
    TestBed.configureTestingModule({
      providers: [
        CardService,
        { provide: Router, useValue: mockRouter }
      ]
    });
    service = TestBed.inject(CardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize dataCard correctly', () => {
    expect(service.dataCard).toBeDefined();
    expect(service.dataCard.id).toBe('0');
    expect(service.dataCard.location).toBe('');
    expect(service.dataCard.numberTerritory).toBe(0);
    expect(service.dataCard.iframe).toBe('');
    expect(service.dataCard.driver).toBe('');
    expect(service.dataCard.start).toBe('');
    expect(service.dataCard.end).toBe('');
    expect(service.dataCard.comments).toBe('');
    expect(service.dataCard.link).toBe('');
    expect(service.dataCard.applesData).toEqual([]);
    expect(service.dataCard.revision).toBe(false);
    expect(service.dataCard.revisionComplete).toBe(false);
  });

  it('should rollback card by setting revision to false', () => {
    service.dataCard.revision = true;
    service.rollbackCard();
    expect(service.dataCard.revision).toBe(false);
  });

  it('should go to revision card and navigate', () => {
    const mockCard: Card = {
      id: '1',
      location: 'loc',
      numberTerritory: 1,
      link: 'test-link'
    } as Card;

    service.goRevisionCard(mockCard);

    expect(mockCard.revision).toBe(true);
    expect(service.dataCard).toEqual(mockCard);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['territorios/test-link']);
  });
});
