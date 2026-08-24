import '@analogjs/vitest-angular/setup-zone';

import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { getTestBed } from '@angular/core/testing';

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

import { vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ElementRef } from '@angular/core';
import { DialogService } from './app/core/services/dialog.service';
import { TerritoryDataService } from './app/core/services/territory-data.service';
import { CampaignService } from './app/core/services/campaign.service';
import { SpinnerService } from './app/core/services/spinner.service';
import { CartDataService } from './app/core/services/cart-data.service';
import { MessagingService } from './app/core/services/messaging.service';

(globalThis as any).jasmine = {
  createSpyObj: (baseName: string, methodNames: string[] | Record<string, any>) => {
    const obj: any = {};
    if (Array.isArray(methodNames)) {
      methodNames.forEach((name) => {
        obj[name] = vi.fn().mockReturnValue(of({}));
      });
    } else if (methodNames) {
      for (const [key, value] of Object.entries(methodNames)) {
        obj[key] = vi.fn().mockReturnValue(value);
      }
    }
    return obj;
  },
};

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { SwUpdate, ServiceWorkerModule } from '@angular/service-worker';
import { of } from 'rxjs';

(globalThis as any).window.bootstrap = { Modal: vi.fn() };
(globalThis as any).window.matchMedia = vi.fn().mockReturnValue({ matches: false });

beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [ServiceWorkerModule.register('', { enabled: false })],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: SwUpdate, useValue: { isEnabled: false, versionUpdates: of({}) } },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            params: { collection: '1' },
            paramMap: { get: () => '1' },
            queryParams: {},
            url: [{ path: 'test' }],
          },
          paramMap: of({ get: () => '1' }),
          queryParams: of({}),
        },
      },
      { provide: ElementRef, useValue: { nativeElement: document.createElement('div') } },
      {
        provide: DialogService,
        useValue: (globalThis as any).jasmine.createSpyObj('DialogService', [
          'openModal',
          'closeModal',
          'confirmDialog',
        ]),
      },
      {
        provide: TerritoryDataService,
        useValue: (globalThis as any).jasmine.createSpyObj('TerritoryDataService', {
          getTerritories: of([{}]),
          getTerritory: of({}),
          getMaps: of([{ maps: [] }]),
          getCongregacion: of({}),
          getGroupList: of([{ id: 'Grupo 1' }]),
          getCardTerritorie: of([{ applesData: [] }]),
          getCardAssigned: of([{ applesData: [] }]),
          getNumberTerritory: of([{}]),
          getWeeklyDepartures: of([{}]),
          getUsers: of([]),
          getWeeklyDeparture: of({}),
          getDateDepartures: of([]),
          getStatisticsButtons: of([]),
          getTerritoryGroups: of({}),
          getDepartures: of([{}]),
          getRevisionCardTerritorie: of([{}]),
        }),
      },
      {
        provide: CampaignService,
        useValue: (globalThis as any).jasmine.createSpyObj('CampaignService', {
          getCampaigns: of([{}]),
          getAllCampaigns: of([{}]),
          getActiveCampaign: Promise.resolve({}),
        }),
      },
      {
        provide: SpinnerService,
        useValue: (globalThis as any).jasmine.createSpyObj('SpinnerService', [
          'show',
          'hide',
          'cargarSpinner',
          'esconderSpinner',
          'cerrarSpinner',
        ]),
      },
      {
        provide: CartDataService,
        useValue: (globalThis as any).jasmine.createSpyObj('CartDataService', {
          getCarts: of([{}]),
          getCart: of({}),
          getAllCarts: of([{}]),
          getCartAssignment: of({ cart: [] }),
          getLocations: of([{}]),
        }),
      },
      {
        provide: MessagingService,
        useValue: (globalThis as any).jasmine.createSpyObj('MessagingService', [
          'sendMessage',
          'success',
          'error',
        ]),
      },
      { provide: MAT_DIALOG_DATA, useValue: {} },
      { provide: MatDialogRef, useValue: { close: vi.fn() } },
      {
        provide: AngularFirestore,
        useValue: {
          collection: () => ({
            valueChanges: () => of([]),
            doc: () => ({ valueChanges: () => of({}) }),
          }),
        },
      },
      {
        provide: AngularFireAuth,
        useValue: { authState: of(null), currentUser: Promise.resolve(null) },
      },
    ],
  });
});
