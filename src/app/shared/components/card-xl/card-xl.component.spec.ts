import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardXlComponent } from './card-xl.component';
import { describe, it, expect, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';

describe('CardXlComponent', () => {
  let component: CardXlComponent;
  let fixture: ComponentFixture<CardXlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardXlComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardXlComponent);
    component = fixture.componentInstance;

    // Set required inputs before detectChanges
    fixture.componentRef.setInput('mapSRC', 'test-image.jpg');
    fixture.componentRef.setInput('mapName', 'Test Map');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render mapSRC in img element', () => {
    const imgElement = fixture.debugElement.query(By.css('img')).nativeElement;
    expect(imgElement.src).toContain('test-image.jpg');
  });

  it('should render mapName in h2 element', () => {
    const h2Element = fixture.debugElement.query(By.css('h2')).nativeElement;
    expect(h2Element.textContent).toContain('Test Map');
  });

  it('should update view when inputs change', () => {
    fixture.componentRef.setInput('mapName', 'Updated Map');
    fixture.detectChanges();
    const h2Element = fixture.debugElement.query(By.css('h2')).nativeElement;
    expect(h2Element.textContent).toContain('Updated Map');
  });
});
