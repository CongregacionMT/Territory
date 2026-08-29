import { TestBed } from '@angular/core/testing';
import { FocusInvalidInputDirective } from './focus-invalid-input.directive';
import { ElementRef } from '@angular/core';

describe('FocusInvalidInputDirective', () => {
  it('should create an instance', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: ElementRef, useValue: new ElementRef(document.createElement('div')) }],
    });
    const directive = TestBed.runInInjectionContext(() => new FocusInvalidInputDirective());
    expect(directive).toBeTruthy();
  });
});
