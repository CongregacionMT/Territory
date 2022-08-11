import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuralAssignmentComponent } from './rural-assignment.component';

describe('RuralAssignmentComponent', () => {
  let component: RuralAssignmentComponent;
  let fixture: ComponentFixture<RuralAssignmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RuralAssignmentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RuralAssignmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
