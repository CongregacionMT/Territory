import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormRuralComponent } from './form-rural.component';

describe('FormRuralComponent', () => {
  let component: FormRuralComponent;
  let fixture: ComponentFixture<FormRuralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [FormRuralComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(FormRuralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
