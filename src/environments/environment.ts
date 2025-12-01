// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  firebase: {
    apiKey: "AIzaSyBdRptzrCwkDB1WvWNU1x-Pn22l48kslEs",
    authDomain: "territorios---wheelwright.firebaseapp.com",
    projectId: "territorios---wheelwright",
    storageBucket: "territorios---wheelwright.firebasestorage.app",
    messagingSenderId: "208368329126",
    appId: "1:208368329126:web:157824c7b22b4bc7f0ef67",
    measurementId: "G-XLQ9YJ42HL"
  },
  production: false,
  congregationName: 'Wheelwright',
  congregationKey: 'wheelwright',
  territoryPrefix: 'TerritorioW',

  // Configuración de localidades
  localities: [
    {
      key: 'wheelwright',
      name: 'Wheelwright',
      territoryPrefix: 'TerritorioW',
      storageKey: 'registerStatisticDataTerritorioW',
      hasNumberedTerritories: true
    }
  ]
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
