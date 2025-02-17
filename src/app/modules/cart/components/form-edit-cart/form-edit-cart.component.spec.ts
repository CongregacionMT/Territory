import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormEditCartComponent } from './form-edit-cart.component';

describe('FormEditCartComponent', () => {
  let component: FormEditCartComponent;
  let fixture: ComponentFixture<FormEditCartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FormEditCartComponent]
    });
    fixture = TestBed.createComponent(FormEditCartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
