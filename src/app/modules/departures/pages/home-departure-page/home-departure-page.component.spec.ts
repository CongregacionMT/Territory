import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeDeparturePageComponent } from './home-departure-page.component';

describe('HomeDeparturePageComponent', () => {
  let component: HomeDeparturePageComponent;
  let fixture: ComponentFixture<HomeDeparturePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [HomeDeparturePageComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(HomeDeparturePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
