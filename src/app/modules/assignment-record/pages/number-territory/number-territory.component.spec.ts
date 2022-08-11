import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NumberTerritoryComponent } from './number-territory.component';

describe('NumberTerritoryComponent', () => {
  let component: NumberTerritoryComponent;
  let fixture: ComponentFixture<NumberTerritoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NumberTerritoryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NumberTerritoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
