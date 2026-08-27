import { Directive, HostListener, ElementRef, inject } from '@angular/core';

@Directive({ selector: '[appFocusInvalidInput]' })
export class FocusInvalidInputDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener('submit')
  onFormSubmit(): void {
    const invalidControl = this.el.nativeElement.querySelector<HTMLElement>('.ng-invalid');
    if (invalidControl) {
      invalidControl.focus();
    }
  }
}
