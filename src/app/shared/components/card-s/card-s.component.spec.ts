import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardSComponent } from './card-s.component';
import { describe, it, expect, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

describe('CardSComponent', () => {
  let component: CardSComponent;
  let fixture: ComponentFixture<CardSComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardSComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardSComponent);
    component = fixture.componentInstance;

    // Set required input
    fixture.componentRef.setInput('terrNumber', { territorio: 1, collection: 'w1' });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render territory number correctly', () => {
    const spanElement = fixture.debugElement.query(By.css('span')).nativeElement;
    expect(spanElement.textContent).toContain('N°1');
  });

  it('should handle undefined territory number gracefully', () => {
    fixture.componentRef.setInput('terrNumber', undefined);
    fixture.detectChanges();
    const spanElement = fixture.debugElement.query(By.css('span')).nativeElement;
    expect(spanElement.textContent).toContain('N°');
  });
});
