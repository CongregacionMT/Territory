import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MariaTeresaComponent } from './maria-teresa.component';

describe('MariaTeresaComponent', () => {
  let component: MariaTeresaComponent;
  let fixture: ComponentFixture<MariaTeresaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MariaTeresaComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MariaTeresaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
