import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDeparturesComponent } from './edit-departures.component';

describe('EditDeparturesComponent', () => {
  let component: EditDeparturesComponent;
  let fixture: ComponentFixture<EditDeparturesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [EditDeparturesComponent]
});
    fixture = TestBed.createComponent(EditDeparturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
