import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TerritoryPageComponent } from './territory-page.component';

describe('TerritoryPageComponent', () => {
  let component: TerritoryPageComponent;
  let fixture: ComponentFixture<TerritoryPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [TerritoryPageComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TerritoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
