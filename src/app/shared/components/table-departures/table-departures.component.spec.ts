import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableDeparturesComponent } from './table-departures.component';

describe('TableDeparturesComponent', () => {
  let component: TableDeparturesComponent;
  let fixture: ComponentFixture<TableDeparturesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [TableDeparturesComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(TableDeparturesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
