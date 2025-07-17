import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentRecordPageComponent } from './assignment-record-page.component';

describe('AssignmentRecordPageComponent', () => {
  let component: AssignmentRecordPageComponent;
  let fixture: ComponentFixture<AssignmentRecordPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [AssignmentRecordPageComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AssignmentRecordPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
