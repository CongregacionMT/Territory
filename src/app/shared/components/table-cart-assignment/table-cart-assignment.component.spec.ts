import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableCartAssignmentComponent } from './table-cart-assignment.component';

describe('TableCartAssignmentComponent', () => {
  let component: TableCartAssignmentComponent;
  let fixture: ComponentFixture<TableCartAssignmentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TableCartAssignmentComponent]
    });
    fixture = TestBed.createComponent(TableCartAssignmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
