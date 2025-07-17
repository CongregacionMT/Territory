import { Directive, HostListener, ElementRef, Input, inject } from '@angular/core';

@Directive({ selector: '[appFocusInvalidInput]' })
export class FocusInvalidInputDirective {
  private el = inject(ElementRef);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() { }
  @HostListener('submit')
  onFormSubmit() {
    const invalidControl = this.el.nativeElement.querySelector('.ng-invalid');
    if (invalidControl) {
      invalidControl.focus();  
    }
  }
}
