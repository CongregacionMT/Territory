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
  production: true,
  congregationName: 'Wheelwright',
  congregationKey: 'wheelwright',
  territoryPrefix: 'TerritorioW',

  // Configuración de localidades (single-locality congregation)
  localities: [
    {
      key: 'wheelwright',
      name: 'Wheelwright',
      territoryPrefix: 'TerritorioW',
      storageKey: 'registerStatisticDataTerritorioW',
      hasNumberedTerritories: true
    },
    {
      key: 'rural',
      name: 'Rural',
      territoryPrefix: 'TerritorioR',
      storageKey: 'registerStatisticDataTerritorioR',
      hasNumberedTerritories: false
    }
  ]
};
