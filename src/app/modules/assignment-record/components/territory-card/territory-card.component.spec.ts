import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerritoryCardComponent } from './territory-card.component';
import { describe, beforeEach, it, expect } from 'vitest';

describe('TerritoryCardComponent', () => {
  let component: TerritoryCardComponent;
  let fixture: ComponentFixture<TerritoryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TerritoryCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TerritoryCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('card', {
      driver: 'Test',
      start: '2023-01-01',
      end: '2023-01-02',
      applesData: [],
      comments: '',
      id: '1',
      isInitial: false,
      link: '',
      modeModal: '',
      name: '1',
      number: '1',
      revision: false,
      creation: { seconds: 123456, nanoseconds: 0 } as any,
    });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
