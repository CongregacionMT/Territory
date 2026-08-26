import { Directive, HostListener, ElementRef, inject } from '@angular/core';

@Directive({ selector: '[appFocusInvalidInput]' })
export class FocusInvalidInputDirective {
  private readonly el = inject(ElementRef);
  constructor() {}
  @HostListener('submit')
  onFormSubmit(): void {
    const invalidControl: HTMLElement | null = this.el.nativeElement.querySelector('.ng-invalid');
    if (invalidControl) {
      invalidControl.focus();
    }
  }
}
