export const environment = {
  firebase: {
    apiKey: "AIzaSyADgG8q9fYZ8eL7TNl1eRXYzhq2M4ShqX8",
    authDomain: "test-territorios.firebaseapp.com",
    projectId: "test-territorios",
    storageBucket: "test-territorios.firebasestorage.app",
    messagingSenderId: "391029463770",
    appId: "1:391029463770:web:fc6155de15fd67b52663e3",
    measurementId: ""
  },
  production: true,
  congregationName: 'Test-congregation',
  congregationKey: 'test-congregation',
  territoryPrefix: 'TerritorioP',

  // Configuración de localidades
  localities: [
    {
      key: 'principal',
      name: 'Principal',
      territoryPrefix: 'TerritorioP',
      storageKey: 'registerStatisticDataTerritorioP',
      hasNumberedTerritories: true
    },
    {
      key: 'calchin',
      name: 'Calchin',
      territoryPrefix: 'TerritorioC',
      storageKey: 'registerStatisticDataTerritorioC',
      hasNumberedTerritories: true
    },
    {
      key: 'salsipuedes',
      name: 'Salsipuedes',
      territoryPrefix: 'TerritorioS',
      storageKey: 'registerStatisticDataTerritorioS',
      hasNumberedTerritories: false
    },
    {
      key: 'caimancito',
      name: 'Caimancito',
      territoryPrefix: 'TerritorioCAI',
      storageKey: 'registerStatisticDataTerritorioCAI',
      hasNumberedTerritories: true
    }
  ]
};
