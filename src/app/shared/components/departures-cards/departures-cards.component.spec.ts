import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeparturesCardsComponent } from './departures-cards.component';

describe('DeparturesCardsComponent', () => {
  let component: DeparturesCardsComponent;
  let fixture: ComponentFixture<DeparturesCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [DeparturesCardsComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(DeparturesCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
