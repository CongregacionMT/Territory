import { SafeHtml } from '@angular/platform-browser';

export interface CardButtonsData {
  name: string;
  src: string;
  link: string;
  iframe?: SafeHtml | string;
}
