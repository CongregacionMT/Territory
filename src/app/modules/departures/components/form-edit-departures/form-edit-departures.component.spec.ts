import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormEditDeparturesComponent } from './form-edit-departures.component';

describe('FormEditDeparturesComponent', () => {
  let component: FormEditDeparturesComponent;
  let fixture: ComponentFixture<FormEditDeparturesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FormEditDeparturesComponent]
    });
    fixture = TestBed.createComponent(FormEditDeparturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
