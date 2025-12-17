import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TablePublishersPageComponent } from './table-publishers-page.component';

describe('TablePublishersPageComponent', () => {
  let component: TablePublishersPageComponent;
  let fixture: ComponentFixture<TablePublishersPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [TablePublishersPageComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(TablePublishersPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
