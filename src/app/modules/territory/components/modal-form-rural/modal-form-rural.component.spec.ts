import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalFormRuralComponent } from './modal-form-rural.component';
import { Router } from '@angular/router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DataRural } from '@core/models/DataRural';

// Mock child component
import { Component } from '@angular/core';

@Component({
  selector: 'app-form-rural',
  template: '',
  standalone: true
})
class MockFormRuralComponent {}

describe('ModalFormRuralComponent', () => {
  let component: ModalFormRuralComponent;
  let fixture: ComponentFixture<ModalFormRuralComponent>;
  let mockRouter: any;
  let mockModal: any;

  beforeEach(async () => {
    mockRouter = {
      navigate: vi.fn()
    };
    
    mockModal = {
      show: vi.fn(),
      hide: vi.fn()
    };
    
    (window as any).bootstrap = {
      Modal: function() { return mockModal; }
    };
    
    vi.spyOn((window as any).bootstrap, 'Modal');

    await TestBed.configureTestingModule({
      imports: [ModalFormRuralComponent],
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    })
    .overrideComponent(ModalFormRuralComponent, {
      remove: { imports: [/* remove original FormRuralComponent if needed, but not strictly required if we mock */] },
      add: { imports: [MockFormRuralComponent] }
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalFormRuralComponent);
    component = fixture.componentInstance;
    
    // Add dummy modal element
    const dummyElement = document.createElement('div');
    dummyElement.id = 'modalID';
    document.body.appendChild(dummyElement);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize modal correctly', () => {
    expect((window as any).bootstrap.Modal).toHaveBeenCalled();
    expect(component.modalElement).toBeDefined();
  });

  it('should handle hidden.bs.modal event', () => {
    component.stateModal = 'open';
    component.editionForm = {} as any;
    
    const event = new Event('hidden.bs.modal');
    document.getElementById('modalID')?.dispatchEvent(event);
    
    expect(component.stateModal).toBe('close');
    expect(component.editionForm).toBeUndefined();
  });

  it('should open modal for creation', () => {
    component.openModalCreation();
    expect(mockModal.show).toHaveBeenCalled();
    expect(component.title).toBe('Crear camino');
    expect(component.stateModal).toBe('open');
  });

  it('should open modal for edition', () => {
    const mockData: DataRural = { id: '1', form: {} } as any;
    component.openModalEdition(mockData);
    expect(mockModal.show).toHaveBeenCalled();
    expect(component.title).toBe('Editar camino');
    expect(component.editionForm).toBe(mockData);
    expect(component.stateModal).toBe('open');
  });

  it('should hide modal', () => {
    component.hideModal();
    expect(mockModal.hide).toHaveBeenCalled();
  });
});
