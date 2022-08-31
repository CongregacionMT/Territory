import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeparturePageComponent } from './departure-page.component';

describe('DeparturePageComponent', () => {
  let component: DeparturePageComponent;
  let fixture: ComponentFixture<DeparturePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeparturePageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeparturePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
