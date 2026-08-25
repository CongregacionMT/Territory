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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
