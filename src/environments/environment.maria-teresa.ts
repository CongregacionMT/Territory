export const environment = {
  firebase: {
    apiKey: "AIzaSyBI1BYUtYjEeEWiFfpR_IwGFip4R54dbVk",
    authDomain: "territorios-422c2.firebaseapp.com",
    projectId: "territorios-422c2",
    storageBucket: "territorios-422c2.appspot.com",
    messagingSenderId: "1086542552314",
    appId: "1:1086542552314:web:a5afc53afaa2f305ebfd43"
  },
  production: true,
  congregationName: 'Maria Teresa',
  congregationKey: 'mariaTeresa',
  territoryPrefix: 'TerritorioMT',

  // Configuración de localidades
  localities: [
    {
      key: 'mariaTeresa',
      name: 'María Teresa',
      territoryPrefix: 'TerritorioMT',
      storageKey: 'registerStatisticDataTerritorioMT',
      hasNumberedTerritories: true
    },
    {
      key: 'christophersen',
      name: 'Christophersen',
      territoryPrefix: 'TerritorioC',
      storageKey: 'registerStatisticDataTerritorioC',
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
