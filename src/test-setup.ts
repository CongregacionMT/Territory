import '@analogjs/vitest-angular/setup-zone';
import { vi, beforeEach } from 'vitest';
import { of } from 'rxjs';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { getTestBed, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ElementRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Firestore } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { SwUpdate, ServiceWorkerModule } from '@angular/service-worker';

import { DialogService } from './app/core/services/dialog.service';
import { TerritoryDataService } from './app/core/services/territory-data.service';
import { CampaignService } from './app/core/services/campaign.service';
import { SpinnerService } from './app/core/services/spinner.service';
import { CartDataService } from './app/core/services/cart-data.service';
import { MessagingService } from './app/core/services/messaging.service';

vi.mock('@angular/fire/firestore', () => {
  return {
    collection: vi.fn(),
    doc: vi.fn(),
    collectionData: vi.fn(() => of([])),
    docData: vi.fn(() => of({})),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
    Timestamp: {
      now: vi.fn(() => ({ seconds: 12345, nanoseconds: 0 })),
      fromDate: vi.fn(() => ({ seconds: 12345, nanoseconds: 0 })),
    },
    runTransaction: vi.fn(),
    Firestore: class Firestore {},
    getFirestore: vi.fn(),
  };
});

vi.mock('@angular/fire/auth', () => {
  return {
    getAuth: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    authState: vi.fn(() => of(null)),
    user: vi.fn(() => of(null)),
    Auth: class Auth {},
  };
});

vi.mock('@angular/fire/database', () => {
  return {
    getDatabase: vi.fn(),
    ref: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    Database: class Database {},
  };
});

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());

function createSpyObj(
  _baseName: string,
  methodNames: string[] | Record<string, unknown>,
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
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
}

interface WindowWithBootstrap extends Window {
  bootstrap?: { Modal: ReturnType<typeof vi.fn> };
}

(window as WindowWithBootstrap).bootstrap = { Modal: vi.fn() };
window.matchMedia = vi.fn().mockReturnValue({ matches: false });

const storageMock = (): Storage => {
  let storage: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => (key in storage ? storage[key] : null),
    setItem: (key: string, value: string): void => {
      storage[key] = value || '';
    },
    removeItem: (key: string): void => {
      delete storage[key];
    },
    clear: (): void => {
      storage = {};
    },
    key: (index: number): string | null => Object.keys(storage)[index] ?? null,
    length: 0,
  };
};

Object.defineProperty(window, 'localStorage', { value: storageMock() });
Object.defineProperty(window, 'sessionStorage', { value: storageMock() });

beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [ServiceWorkerModule.register('', { enabled: false })],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: SwUpdate, useValue: { isEnabled: false, versionUpdates: of({}) } },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            params: { collection: '1' },
            paramMap: { get: (): string => '1' },
            queryParams: {},
            url: [{ path: 'test' }],
          },
          paramMap: of({ get: (): string => '1' }),
          queryParams: of({}),
        },
      },
      { provide: ElementRef, useValue: { nativeElement: document.createElement('div') } },
      {
        provide: DialogService,
        useValue: createSpyObj('DialogService', ['openModal', 'closeModal', 'confirmDialog']),
      },
      {
        provide: TerritoryDataService,
        useValue: createSpyObj('TerritoryDataService', {
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
        useValue: createSpyObj('CampaignService', {
          getCampaigns: of([{}]),
          getAllCampaigns: of([{}]),
          getActiveCampaign: Promise.resolve({}),
        }),
      },
      {
        provide: SpinnerService,
        useValue: createSpyObj('SpinnerService', [
          'show',
          'hide',
          'cargarSpinner',
          'esconderSpinner',
          'cerrarSpinner',
        ]),
      },
      {
        provide: CartDataService,
        useValue: createSpyObj('CartDataService', {
          getCarts: of([{}]),
          getCart: of({}),
          getAllCarts: of([{}]),
          getCartAssignment: of({ cart: [] }),
          getLocations: of([{}]),
        }),
      },
      {
        provide: MessagingService,
        useValue: createSpyObj('MessagingService', ['sendMessage', 'success', 'error']),
      },
      { provide: MAT_DIALOG_DATA, useValue: {} },
      { provide: MatDialogRef, useValue: { close: vi.fn() } },
      {
        provide: Firestore,
        useValue: {},
      },
      {
        provide: Auth,
        useValue: {},
      },
    ],
  });
});
