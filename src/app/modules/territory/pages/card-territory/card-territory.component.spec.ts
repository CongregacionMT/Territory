import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardTerritoryComponent } from './card-territory.component';

describe('CardTerritoryComponent', () => {
  let component: CardTerritoryComponent;
  let fixture: ComponentFixture<CardTerritoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [CardTerritoryComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardTerritoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
