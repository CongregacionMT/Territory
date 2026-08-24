import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CartAssignmentCardsComponent } from './cart-assignment-cards.component';

describe('CartAssignmentCardsComponent', () => {
  let component: CartAssignmentCardsComponent;
  let fixture: ComponentFixture<CartAssignmentCardsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CartAssignmentCardsComponent],
    });
    fixture = TestBed.createComponent(CartAssignmentCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
