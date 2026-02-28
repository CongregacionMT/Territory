export const environment = {
  firebase: {
    apiKey: "AIzaSyCdqthZdADXc_F6UDF2sKWJanlDJ6viVmc",
    authDomain: "territorios-arias.firebaseapp.com",
    projectId: "territorios-arias",
    storageBucket: "territorios-arias.firebasestorage.app",
    messagingSenderId: "813517020775",
    appId: "1:813517020775:web:0807bcea3ff13046993ec2",
    measurementId: ""
  },
  production: true,
  congregationName: 'Arias',
  congregationKey: 'arias',
  territoryPrefix: 'TerritorioA',

  // Configuración de localidades
  localities: [
    {
      key: 'arias',
      name: 'Arias',
      territoryPrefix: 'TerritorioA',
      storageKey: 'registerStatisticDataTerritorioA',
      hasNumberedTerritories: true
    }
  ]
};
