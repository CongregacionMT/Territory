import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChristophersenAssignmentComponent } from './christophersen-assignment.component';

describe('ChristophersenAssignmentComponent', () => {
  let component: ChristophersenAssignmentComponent;
  let fixture: ComponentFixture<ChristophersenAssignmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChristophersenAssignmentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChristophersenAssignmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
