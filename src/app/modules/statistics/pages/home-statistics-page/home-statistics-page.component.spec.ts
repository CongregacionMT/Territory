import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeStatisticsPageComponent } from './home-statistics-page.component';

describe('HomeStatisticsPageComponent', () => {
  let component: HomeStatisticsPageComponent;
  let fixture: ComponentFixture<HomeStatisticsPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [HomeStatisticsPageComponent]
});
    fixture = TestBed.createComponent(HomeStatisticsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
