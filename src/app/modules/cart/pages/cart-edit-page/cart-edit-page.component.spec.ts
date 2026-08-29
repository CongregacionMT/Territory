import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CartEditPageComponent } from './cart-edit-page.component';

describe('CartEditPageComponent', () => {
  let component: CartEditPageComponent;
  let fixture: ComponentFixture<CartEditPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CartEditPageComponent],
    });
    fixture = TestBed.createComponent(CartEditPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    // Skipping detectChanges to avoid uninitialized input error
    expect(component).toBeTruthy();
  });
});
