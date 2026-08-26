import { Directive, HostListener, ElementRef, inject } from '@angular/core';

@Directive({ selector: '[appFocusInvalidInput]' })
export class FocusInvalidInputDirective {
  private el = inject(ElementRef);
  constructor() {}
  @HostListener('submit')
  onFormSubmit(): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const invalidControl: HTMLElement | null = this.el.nativeElement.querySelector('.ng-invalid');
    if (invalidControl) {
      invalidControl.focus();
    }
  }
}
