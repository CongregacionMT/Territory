import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapasComponent } from './mapas.component';

describe('MapasComponent', () => {
  let component: MapasComponent;
  let fixture: ComponentFixture<MapasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MapasComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
