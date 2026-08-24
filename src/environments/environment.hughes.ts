export const environment = {
  firebase: {
    apiKey: 'AIzaSyDFDMj59LatGBxEcU_bqb4eMocm36ZyY_o',
    authDomain: 'territorios-hughes.firebaseapp.com',
    projectId: 'territorios-hughes',
    storageBucket: 'territorios-hughes.firebasestorage.app',
    messagingSenderId: '698750283432',
    appId: '1:698750283432:web:a012aec4a06b681288dc9d',
    measurementId: '',
  },
  googleMapsApiKey: 'AIzaSyCqn3TvPUjylJsZSWFchRJ9yeDmjMGiKXU',
  mapId: '5d8d6c22a66f94b7804fb3a7',
  production: true,
  congregationName: 'Hughes',
  congregationKey: 'hughes',
  territoryPrefix: 'TerritorioH',

  // Configuración de localidades
  localities: [
    {
      key: 'hughes',
      name: 'Hughes',
      territoryPrefix: 'TerritorioH',
      storageKey: 'registerStatisticDataTerritorioH',
      hasNumberedTerritories: true,
    },
    {
      key: 'labordeboy',
      name: 'Labordeboy',
      territoryPrefix: 'TerritorioL',
      storageKey: 'registerStatisticDataTerritorioL',
      hasNumberedTerritories: true,
    },
    {
      key: 'villa-estela',
      name: 'Villa Estela',
      territoryPrefix: 'TerritorioVE',
      storageKey: 'registerStatisticDataTerritorioVE',
      hasNumberedTerritories: true,
    },
  ],
};
