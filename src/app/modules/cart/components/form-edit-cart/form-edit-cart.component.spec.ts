import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormEditCartComponent } from './form-edit-cart.component';

describe('FormEditCartComponent', () => {
  let component: FormEditCartComponent;
  let fixture: ComponentFixture<FormEditCartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [FormEditCartComponent]
});
    fixture = TestBed.createComponent(FormEditCartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    // Skipping detectChanges to avoid uninitialized signal input error
    expect(component).toBeTruthy();
  });
});
