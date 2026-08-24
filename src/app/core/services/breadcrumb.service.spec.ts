import { TestBed } from '@angular/core/testing';
import { BreadcrumbService } from './breadcrumb.service';
import { Router, ActivationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('BreadcrumbService', () => {
  let service: BreadcrumbService;
  let mockRouter: any;
  let eventsSubject: Subject<any>;

  beforeEach(() => {
    eventsSubject = new Subject<any>();
    
    mockRouter = {
      events: eventsSubject.asObservable(),
      url: '/home',
      routerState: {
        snapshot: {
          root: {
            url: [],
            data: {},
            firstChild: null
          }
        }
      }
    };

    TestBed.configureTestingModule({
      providers: [
        BreadcrumbService,
        { provide: Router, useValue: mockRouter }
      ]
    });
    service = TestBed.inject(BreadcrumbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should hide breadcrumb on home route', () => {
    mockRouter.url = '/home';
    eventsSubject.next(new ActivationEnd({} as any));
    expect(service.showBreadcrumb()).toBe(false);
  });

  it('should hide breadcrumb on root route', () => {
    mockRouter.url = '/';
    eventsSubject.next(new ActivationEnd({} as any));
    expect(service.showBreadcrumb()).toBe(false);
  });

  it('should build breadcrumbs correctly', () => {
    mockRouter.url = '/territorios/edit';
    mockRouter.routerState.snapshot.root = {
      url: [],
      data: {},
      firstChild: {
        url: [{ path: 'territorios' }],
        data: { breadcrumb: 'Territorios' },
        firstChild: {
          url: [{ path: 'edit' }],
          data: { breadcrumb: 'Edit' },
          firstChild: null
        }
      }
    };

    eventsSubject.next(new ActivationEnd({} as any));
    
    expect(service.showBreadcrumb()).toBe(true);
    const breadcrumbs = service.breadcrumbs();
    expect(breadcrumbs.length).toBe(3);
    
    expect(breadcrumbs[0]).toEqual({ name: 'Inicio', route: '/home' });
    expect(breadcrumbs[1]).toEqual({ name: 'Territorios', route: '/territorios' });
    expect(breadcrumbs[2]).toEqual({ name: 'Edit', route: '/territorios/edit' });
  });

  it('should prevent duplicate breadcrumbs', () => {
    mockRouter.url = '/territorios/edit';
    mockRouter.routerState.snapshot.root = {
      url: [],
      data: {},
      firstChild: {
        url: [{ path: 'territorios' }],
        data: { breadcrumb: 'Territorios' },
        firstChild: {
          // Empty path but same breadcrumb
          url: [],
          data: { breadcrumb: 'Territorios' },
          firstChild: null
        }
      }
    };

    eventsSubject.next(new ActivationEnd({} as any));
    
    const breadcrumbs = service.breadcrumbs();
    expect(breadcrumbs.length).toBe(2); // Inicio and Territorios
    expect(breadcrumbs[1]).toEqual({ name: 'Territorios', route: '/territorios' });
  });
});
