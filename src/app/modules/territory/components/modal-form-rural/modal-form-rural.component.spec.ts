import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalFormRuralComponent } from './modal-form-rural.component';

describe('ModalFormRuralComponent', () => {
  let component: ModalFormRuralComponent;
  let fixture: ComponentFixture<ModalFormRuralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [ModalFormRuralComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(ModalFormRuralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
