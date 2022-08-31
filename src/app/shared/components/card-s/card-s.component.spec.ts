import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardSComponent } from './card-s.component';

describe('CardSComponent', () => {
  let component: CardSComponent;
  let fixture: ComponentFixture<CardSComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CardSComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardSComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
