import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MariaTeresaAssignmentComponent } from './maria-teresa-assignment.component';

describe('MariaTeresaAssignmentComponent', () => {
  let component: MariaTeresaAssignmentComponent;
  let fixture: ComponentFixture<MariaTeresaAssignmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MariaTeresaAssignmentComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MariaTeresaAssignmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
