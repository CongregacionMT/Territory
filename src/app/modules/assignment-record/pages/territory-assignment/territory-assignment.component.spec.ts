import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerritoryAssignmentComponent } from './territory-assignment.component';

describe('TerritoryAssignmentComponent', () => {
  let component: TerritoryAssignmentComponent;
  let fixture: ComponentFixture<TerritoryAssignmentComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [TerritoryAssignmentComponent]
});
    fixture = TestBed.createComponent(TerritoryAssignmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
