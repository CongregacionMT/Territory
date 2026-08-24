import { Injectable, signal } from '@angular/core';
import { ActivationEnd, Router } from '@angular/router';
import { BreadcrumbItem } from '../models/Breadcrumb';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class BreadcrumbService {
  private _breadcrumbs = signal<BreadcrumbItem[]>([]);
  public readonly breadcrumbs = this._breadcrumbs.asReadonly();

  private _showBreadcrumb = signal<boolean>(false);
  public readonly showBreadcrumb = this._showBreadcrumb.asReadonly();

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event) => event instanceof ActivationEnd))
      .subscribe((event: any) => {
        // Rebuild the breadcrumb logic based on the root route
        const root = this.router.routerState.snapshot.root;
        const breadcrumbs: BreadcrumbItem[] = [{ name: 'Inicio', route: '/home' }];

        this.addBreadcrumb(root, [], breadcrumbs);

        // If we are on home or root route, hide breadcrumbs
        const isHome = this.router.url === '/home' || this.router.url === '/';
        this._showBreadcrumb.set(!isHome && breadcrumbs.length > 0);

        this._breadcrumbs.set(breadcrumbs);
      });
  }

  private addBreadcrumb(route: any, url: string[], breadcrumbs: BreadcrumbItem[]): void {
    if (route) {
      // Create path from route segments
      const routeUrl = route.url.map((segment: any) => segment.path).join('/');

      if (routeUrl !== '') {
        url.push(routeUrl);
      }

      // Check if route has breadcrumb data
      if (route.data && route.data.breadcrumb) {
        const breadcrumb: BreadcrumbItem = {
          name: route.data.breadcrumb,
          route: '/' + url.join('/'),
        };

        // Prevent duplicates (e.g. if parent and child have the same breadcrumb name/route)
        const exists = breadcrumbs.find((b) => b.route === breadcrumb.route);
        if (!exists) {
          breadcrumbs.push(breadcrumb);
        }
      }

      // Recursively process children
      if (route.firstChild) {
        this.addBreadcrumb(route.firstChild, [...url], breadcrumbs);
      }
    }
  }
}
