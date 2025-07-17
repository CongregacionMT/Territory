import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardXlComponent } from './card-xl.component';

describe('CardXlComponent', () => {
  let component: CardXlComponent;
  let fixture: ComponentFixture<CardXlComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [CardXlComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardXlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
