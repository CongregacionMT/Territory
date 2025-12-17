const admin = require('firebase-admin');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

/**
 * Script automatizado para crear una nueva congregación
 * Automatiza:
 * - Creación de archivos de entorno
 * - Creación de archivos de mapas
 * - Actualización de angular.json
 * - Actualización de territory-routing.module.ts
 * - Inicialización de base de datos
 */

// Ejecución del script: node scripts/setup-congregation.js

// ============================================================================
// UTILIDADES
// ============================================================================

function toKebabCase(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function toCamelCase(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s(.)/g, (match, group1) => group1.toUpperCase())
    .replace(/\s/g, '');
}

function toPascalCase(str) {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

// ============================================================================
// GENERADORES DE ARCHIVOS
// ============================================================================

function generateEnvironmentFile(config) {
  const { congregationName, congregationKey, firebase, localities } = config;

  const localitiesCode = localities.map(loc => `    {
      key: '${loc.key}',
      name: '${loc.name}',
      territoryPrefix: '${loc.territoryPrefix}',
      storageKey: '${loc.storageKey}',
      hasNumberedTerritories: ${loc.hasNumberedTerritories}
    }`).join(',\n');

  return `export const environment = {
  firebase: {
    apiKey: "${firebase.apiKey}",
    authDomain: "${firebase.authDomain}",
    projectId: "${firebase.projectId}",
    storageBucket: "${firebase.storageBucket}",
    messagingSenderId: "${firebase.messagingSenderId}",
    appId: "${firebase.appId}",
    measurementId: "${firebase.measurementId || ''}"
  },
  production: true,
  congregationName: '${congregationName}',
  congregationKey: '${congregationKey}',
  territoryPrefix: '${localities[0].territoryPrefix}',

  // Configuración de localidades
  localities: [
${localitiesCode}
  ]
};
`;
}

function generateMapsFile(config) {
  const { localities } = config;

  let mapsEntries = [];

  // Generar entradas de mapas para cada localidad
  localities.forEach(locality => {
    if (locality.hasNumberedTerritories && locality.numTerritories) {
      for (let i = 1; i <= locality.numTerritories; i++) {
        mapsEntries.push(`    "${locality.territoryPrefix}-${i}": '<iframe src="" width="640" height="480"></iframe>'`);
      }
    } else if (!locality.hasNumberedTerritories) {
      mapsEntries.push(`    "${locality.territoryPrefix}": '<iframe src="" width="640" height="480"></iframe>'`);
    }

    // Mapa general de la localidad
    mapsEntries.push(`    "${locality.key}": '<iframe src="" width="100%" height="100%" style="border: 0" loading="lazy" allowfullscreen></iframe>'`);
  });

  // Mapa de ubicaciones del superintendente
  mapsEntries.push(`    "ubications-overseer": '<iframe src="" width="100%" height="100%" style="border: 0" loading="lazy" allowfullscreen></iframe>'`);

  return `import { MapConfig } from './maps.types';

export const mapConfig: MapConfig = {
  maps: {
${mapsEntries.join(',\n')}
  }
};
`;
}

function updateAngularJson(congregationKey) {
  const angularJsonPath = path.join(__dirname, '..', 'angular.json');
  const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));

  const buildConfig = {
    fileReplacements: [
      {
        replace: "src/environments/environment.ts",
        with: `src/environments/environment.${congregationKey}.ts`
      },
      {
        replace: "src/app/core/config/maps.config.ts",
        with: `src/app/core/config/maps.${congregationKey}.ts`
      }
    ],
    budgets: [
      {
        type: "initial",
        maximumWarning: "1mb",
        maximumError: "2mb"
      },
      {
        type: "anyComponentStyle",
        maximumWarning: "2kb",
        maximumError: "6kb"
      }
    ],
    outputHashing: "all"
  };

  // Agregar configuración de build
  angularJson.projects.territory.architect.build.configurations[congregationKey] = buildConfig;

  // Agregar configuración de serve
  angularJson.projects.territory.architect.serve.configurations[congregationKey] = {
    buildTarget: `territory:build:${congregationKey}`
  };

  fs.writeFileSync(angularJsonPath, JSON.stringify(angularJson, null, 2));
  console.log('   ✓ angular.json actualizado');
}

function updateTerritoryRouting(localities) {
  const routingPath = path.join(__dirname, '..', 'src', 'app', 'modules', 'territory', 'territory-routing.module.ts');
  let content = fs.readFileSync(routingPath, 'utf8');

  // Encontrar la sección de rutas
  const routesRegex = /const routes: Routes = \[\s*\{\s*path: '',\s*children: \[([\s\S]*?)\]\s*\}\s*\];/;
  const match = content.match(routesRegex);

  if (!match) {
    console.log('   ⚠ No se pudo actualizar territory-routing.module.ts automáticamente');
    return;
  }

  const existingRoutes = match[1];

  // Generar nuevas rutas para las localidades
  const newRoutes = localities.map(loc =>
    `      { path: '${loc.key}', component: MapasComponent},`
  ).join('\n');

  // Buscar la línea de "Otras rutas generales" o similar para insertar antes
  const insertPoint = existingRoutes.indexOf('// Otras rutas generales');

  if (insertPoint !== -1) {
    // Verificar si las rutas ya existen
    let routesToAdd = [];
    localities.forEach(loc => {
      if (!existingRoutes.includes(`path: '${loc.key}'`)) {
        routesToAdd.push(`      { path: '${loc.key}', component: MapasComponent},`);
      }
    });

    if (routesToAdd.length > 0) {
      const beforeInsert = existingRoutes.substring(0, insertPoint);
      const afterInsert = existingRoutes.substring(insertPoint);
      const updatedRoutes = beforeInsert + routesToAdd.join('\n') + '\n\n      ' + afterInsert;

      const updatedContent = content.replace(existingRoutes, updatedRoutes);
      fs.writeFileSync(routingPath, updatedContent);
      console.log('   ✓ territory-routing.module.ts actualizado');
    } else {
      console.log('   ℹ Las rutas ya existen en territory-routing.module.ts');
    }
  } else {
    console.log('   ⚠ No se pudo encontrar el punto de inserción en territory-routing.module.ts');
    console.log('   👉 Agrega manualmente las siguientes rutas:');
    console.log(newRoutes);
  }
}

// ============================================================================
// INICIALIZACIÓN DE FIREBASE
// ============================================================================

async function initializeFirebase(config, localitiesData) {
  const db = admin.firestore();

  console.log('\n📦 Inicializando base de datos Firebase...\n');

  // 1. Crear territorios
  for (const localityData of localitiesData) {
    const { locality, numTerritories, applesPerTerritory } = localityData;

    console.log(`   Procesando ${locality.name}...`);

    for (let i = 1; i <= numTerritories; i++) {
      // ✅ CORREGIDO: Usar guión en lugar de espacio
      const collectionName = `${locality.territoryPrefix}-${i}`;
      const collectionRef = db.collection(collectionName);
      const existingDocs = await collectionRef.limit(1).get();

      if (existingDocs.empty) {
        // ✅ CORREGIDO: Manzanas con nombre "Manzana N"
        const applesData = Array.from(
          { length: applesPerTerritory[i - 1] || 0 },
          (_, index) => ({ name: `Manzana ${index + 1}`, checked: false })
        );

        const initialCard = {
          location: locality.key,
          locality: locality.key,
          numberTerritory: i,
          applesData: applesData,
          creation: admin.firestore.Timestamp.now(),
          revision: false,
          completed: 0,
          driver: '',
          start: '',
          end: '',
          comments: 'Inicializado por script',
          link: collectionName // ✅ CORREGIDO: Usar el nombre de la colección
        };

        await collectionRef.add(initialCard);
        console.log(`      ✓ Creado: ${collectionName}`);
      } else {
        console.log(`      ⊙ Ya existe: ${collectionName}`);
      }
    }
  }

  // 2. Crear colección MapsTerritory
  const mapsRef = db.collection('MapsTerritory').doc(config.congregationKey);
  const mapsDoc = await mapsRef.get();

  if (!mapsDoc.exists) {
    const mapsData = {
      maps: localitiesData.map(ld => ({
        link: ld.locality.key, // ✅ Usar la key de la localidad (en minúsculas)
        name: ld.locality.name,
        src: 'https://i.postimg.cc/5XbRCwC8/mt.png' // Placeholder
      }))
    };

    await mapsRef.set(mapsData);
    console.log('   ✓ Colección MapsTerritory creada');
  } else {
    console.log('   ⊙ MapsTerritory ya existe');
  }

  // 3. Crear colección Statistics
  const statsRef = db.collection('Statistics').doc(config.congregationKey);
  const statsDoc = await statsRef.get();

  if (!statsDoc.exists) {
    const statsData = {
      territorio: localitiesData.map(ld => ({
        link: ld.locality.key, // ✅ Usar la key de la localidad (en minúsculas)
        name: ld.locality.name,
        src: '../../../assets/img/group.png'
      }))
    };

    await statsRef.set(statsData);
    console.log('   ✓ Colección Statistics creada');
  } else {
    console.log('   ⊙ Statistics ya existe');
  }

  // 4. Crear colección NumberTerritory
  const numberTerritoryRef = db.collection('NumberTerritory').doc(config.congregationKey);
  const numberTerritoryDoc = await numberTerritoryRef.get();

  if (!numberTerritoryDoc.exists) {
    const numberTerritoryData = {};

    // Crear estructura por localidad
    localitiesData.forEach(ld => {
      if (ld.locality.hasNumberedTerritories) {
        // Localidades con territorios numerados
        numberTerritoryData[ld.locality.key] = Array.from(
          { length: ld.numTerritories },
          (_, i) => ({
            territorio: `${i + 1}`,
            collection: `${ld.locality.territoryPrefix}-${i + 1}`
          })
        );
      } else {
        // Localidades sin territorios numerados (ej: rural)
        numberTerritoryData[ld.locality.key] = Array.from(
          { length: ld.numTerritories },
          () => ({
            nombre: '',
            distancia: ''
          })
        );
      }
    });

    await numberTerritoryRef.set(numberTerritoryData);
    console.log('   ✓ Colección NumberTerritory creada');
  } else {
    console.log('   ⊙ NumberTerritory ya existe');
  }

  // 5. Crear colección Departures
  const departuresDocRef = db.collection('Departures').doc('docDeparture');
  const departuresDocExists = await departuresDocRef.get();

  if (!departuresDocExists.exists) {
    const departuresData = {
      departure: [
        {
          driver: '',
          location: localitiesData[0]?.locality.key || '',
          territory: [],
          date: new Date().toISOString().split('T')[0],
          maps: '',
          point: '',
          schedule: '09:30',
          color: 'success',
          group: 0
        }
      ]
    };

    await departuresDocRef.set(departuresData);
    console.log('   ✓ Colección Departures (docDeparture) creada');
  } else {
    console.log('   ⊙ Departures (docDeparture) ya existe');
  }

  const dateDepartureRef = db.collection('Departures').doc('dateDeparture');
  const dateDepartureExists = await dateDepartureRef.get();

  if (!dateDepartureExists.exists) {
    const dateDepartureData = {
      date: new Date().toISOString().split('T')[0]
    };

    await dateDepartureRef.set(dateDepartureData);
    console.log('   ✓ Colección Departures (dateDeparture) creada');
  } else {
    console.log('   ⊙ Departures (dateDeparture) ya existe');
  }

  // 6. Crear colección Cart
  const cartDocRef = db.collection('Cart').doc('docCart');
  const cartDocExists = await cartDocRef.get();

  if (!cartDocExists.exists) {
    const cartData = {
      cart: [
        {
          assignment: '',
          location: {
            name: '',
            linkMap: ''
          },
          date: 'Lunes',
          schedule: '09:30',
          color: 'success'
        }
      ]
    };

    await cartDocRef.set(cartData);
    console.log('   ✓ Colección Cart (docCart) creada');
  } else {
    console.log('   ⊙ Cart (docCart) ya existe');
  }

  const locationsRef = db.collection('Cart').doc('locations');
  const locationsExists = await locationsRef.get();

  if (!locationsExists.exists) {
    const locationsData = {
      locations: [
        {
          name: '',
          linkMap: ''
        }
      ]
    };

    await locationsRef.set(locationsData);
    console.log('   ✓ Colección Cart (locations) creada');
  } else {
    console.log('   ⊙ Cart (locations) ya existe');
  }

  // 7. Crear usuario admin
  const usersRef = db.collection('users');
  await usersRef.doc('admin').set({
    user: 'admin',
    password: 'admin2026',
    rol: 'admin'
  }, { merge: true });

  console.log('   ✓ Usuario admin creado/actualizado');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🚀 Configuración Automatizada de Nueva Congregación\n');
  console.log('Este script automatizará:');
  console.log('  ✓ Creación de archivos de entorno');
  console.log('  ✓ Creación de archivos de mapas');
  console.log('  ✓ Actualización de angular.json');
  console.log('  ✓ Actualización de territory-routing.module.ts');
  console.log('  ✓ Inicialización de base de datos Firebase\n');

  const prompt = inquirer.createPromptModule();

  // ============================================================================
  // PASO 1: Información básica de la congregación
  // ============================================================================

  console.log('📝 PASO 1: Información Básica\n');

  const basicInfo = await prompt([
    {
      type: 'input',
      name: 'congregationName',
      message: 'Nombre de la congregación:',
      validate: input => input.length > 0 ? true : 'El nombre no puede estar vacío'
    }
  ]);

  const congregationKey = toKebabCase(basicInfo.congregationName);

  console.log(`\n   Clave generada: ${congregationKey}`);

  const { confirmKey } = await prompt([
    {
      type: 'confirm',
      name: 'confirmKey',
      message: '¿Usar esta clave?',
      default: true
    }
  ]);

  let finalKey = congregationKey;
  if (!confirmKey) {
    const { customKey } = await prompt([
      {
        type: 'input',
        name: 'customKey',
        message: 'Ingresa la clave personalizada:',
        default: congregationKey
      }
    ]);
    finalKey = customKey;
  }

  // ============================================================================
  // PASO 2: Configuración de Firebase
  // ============================================================================

  console.log('\n📱 PASO 2: Configuración de Firebase\n');
  console.log('Obtén estos datos desde la Consola de Firebase:');
  console.log('  Configuración del proyecto > General > Tus aplicaciones > SDK de Firebase\n');

  const firebaseConfig = await prompt([
    {
      type: 'input',
      name: 'projectId',
      message: 'Project ID:',
      validate: input => input.length > 0 ? true : 'Requerido'
    },
    {
      type: 'input',
      name: 'apiKey',
      message: 'API Key:',
      validate: input => input.length > 0 ? true : 'Requerido'
    },
    {
      type: 'input',
      name: 'authDomain',
      message: 'Auth Domain:',
      default: answers => `${answers.projectId}.firebaseapp.com`
    },
    {
      type: 'input',
      name: 'storageBucket',
      message: 'Storage Bucket:',
      default: answers => `${answers.projectId}.firebasestorage.app`
    },
    {
      type: 'input',
      name: 'messagingSenderId',
      message: 'Messaging Sender ID:',
      validate: input => input.length > 0 ? true : 'Requerido'
    },
    {
      type: 'input',
      name: 'appId',
      message: 'App ID:',
      validate: input => input.length > 0 ? true : 'Requerido'
    },
    {
      type: 'input',
      name: 'measurementId',
      message: 'Measurement ID (opcional):',
      default: ''
    }
  ]);

  // ============================================================================
  // PASO 3: Configuración de localidades
  // ============================================================================

  console.log('\n📍 PASO 3: Configuración de Localidades\n');

  const { numLocalities } = await prompt([
    {
      type: 'number',
      name: 'numLocalities',
      message: '¿Cuántas localidades tiene la congregación?',
      default: 1,
      validate: input => input > 0 ? true : 'Debe ser mayor a 0'
    }
  ]);

  const localities = [];

  for (let i = 0; i < numLocalities; i++) {
    console.log(`\n   Localidad ${i + 1}/${numLocalities}:`);

    const localityInfo = await prompt([
      {
        type: 'input',
        name: 'name',
        message: '  Nombre de la localidad:',
        default: i === 0 ? basicInfo.congregationName : '',
        validate: input => input.length > 0 ? true : 'El nombre no puede estar vacío'
      },
      {
        type: 'input',
        name: 'territoryPrefix',
        message: '  Prefijo de territorio (ej: TerritorioMT):',
        default: answers => {
          const initials = answers.name.split(' ').map(w => w[0]).join('').toUpperCase();
          return `Territorio${initials}`;
        }
      },
      {
        type: 'confirm',
        name: 'hasNumberedTerritories',
        message: '  ¿Tiene territorios numerados?',
        default: true
      }
    ]);

    const localityKey = toKebabCase(localityInfo.name);
    const storageKey = `registerStatisticData${localityInfo.territoryPrefix}`;

    let numTerritories = 0;
    let applesPerTerritory = [];

    if (localityInfo.hasNumberedTerritories) {
      const territoryConfig = await prompt([
        {
          type: 'number',
          name: 'numTerritories',
          message: '  ¿Cuántos territorios numerados?',
          default: 10,
          validate: input => input > 0 ? true : 'Debe ser mayor a 0'
        }
      ]);

      numTerritories = territoryConfig.numTerritories;

      console.log(`\n  📋 Configurando manzanas para cada territorio:\n`);

      // Preguntar manzanas por cada territorio (SIN valor por defecto)
      for (let j = 1; j <= numTerritories; j++) {
        const { apples } = await prompt([
          {
            type: 'number',
            name: 'apples',
            message: `    Territorio ${j} - Número de manzanas:`,
            validate: input => {
              if (input === undefined || input === null || input === '') {
                return 'Debes ingresar un número';
              }
              if (input < 0) {
                return 'Debe ser 0 o mayor';
              }
              return true;
            }
          }
        ]);
        applesPerTerritory.push(apples);
      }
    } else {
      const { numTerr } = await prompt([
        {
          type: 'number',
          name: 'numTerr',
          message: '  ¿Cuántos territorios crear?',
          default: 5,
          validate: input => input > 0 ? true : 'Debe ser mayor a 0'
        }
      ]);
      numTerritories = numTerr;
      applesPerTerritory = Array(numTerritories).fill(0);
    }

    localities.push({
      key: localityKey,
      name: localityInfo.name,
      territoryPrefix: localityInfo.territoryPrefix,
      storageKey: storageKey,
      hasNumberedTerritories: localityInfo.hasNumberedTerritories,
      numTerritories: numTerritories,
      applesPerTerritory: applesPerTerritory
    });
  }

  // ============================================================================
  // PASO 4: Confirmación y resumen
  // ============================================================================

  console.log('\n\n📋 RESUMEN DE CONFIGURACIÓN:\n');
  console.log(`   Congregación: ${basicInfo.congregationName}`);
  console.log(`   Clave: ${finalKey}`);
  console.log(`   Firebase Project: ${firebaseConfig.projectId}`);
  console.log(`   Localidades: ${localities.length}`);
  localities.forEach(loc => {
    console.log(`     - ${loc.name} (${loc.territoryPrefix}): ${loc.numTerritories} territorios`);
  });
  console.log('');

  const { confirmSetup } = await prompt([
    {
      type: 'confirm',
      name: 'confirmSetup',
      message: '¿Proceder con la configuración?',
      default: true
    }
  ]);

  if (!confirmSetup) {
    console.log('\n❌ Configuración cancelada');
    process.exit(0);
  }

  // ============================================================================
  // PASO 5: Crear archivos
  // ============================================================================

  console.log('\n📁 PASO 5: Creando archivos...\n');

  const config = {
    congregationName: basicInfo.congregationName,
    congregationKey: finalKey,
    firebase: firebaseConfig,
    localities: localities
  };

  // 5.1 Crear archivo de entorno
  const envPath = path.join(__dirname, '..', 'src', 'environments', `environment.${finalKey}.ts`);
  const envContent = generateEnvironmentFile(config);
  fs.writeFileSync(envPath, envContent);
  console.log(`   ✓ Creado: environment.${finalKey}.ts`);

  // 5.2 Crear archivo de mapas
  const mapsPath = path.join(__dirname, '..', 'src', 'app', 'core', 'config', `maps.${finalKey}.ts`);
  const mapsContent = generateMapsFile(config);
  fs.writeFileSync(mapsPath, mapsContent);
  console.log(`   ✓ Creado: maps.${finalKey}.ts`);

  // 5.3 Actualizar angular.json
  updateAngularJson(finalKey);

  // 5.4 Actualizar territory-routing.module.ts
  updateTerritoryRouting(localities);

  // ============================================================================
  // PASO 6: Inicializar Firebase
  // ============================================================================

  console.log('\n🔥 PASO 6: Inicializando Firebase...\n');

  const { initFirebase } = await prompt([
    {
      type: 'confirm',
      name: 'initFirebase',
      message: '¿Inicializar base de datos Firebase ahora?',
      default: true
    }
  ]);

  if (initFirebase) {
    // Verificar Service Account Key
    const serviceAccountPath = path.join(__dirname, 'service-account.json');
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('\n❌ Error: service-account.json no encontrado');
      console.log('👉 Descarga tu Firebase Service Account Key y guárdalo como scripts/service-account.json');
      console.log('   Luego ejecuta: node scripts/init-congregation.js\n');
    } else {
      const serviceAccount = require(serviceAccountPath);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      const localitiesData = localities.map(loc => ({
        locality: loc,
        numTerritories: loc.numTerritories,
        applesPerTerritory: loc.applesPerTerritory
      }));

      await initializeFirebase(config, localitiesData);
    }
  }

  // ============================================================================
  // RESUMEN FINAL
  // ============================================================================

  console.log('\n\n✅ ¡CONFIGURACIÓN COMPLETADA!\n');
  console.log('📝 Archivos creados:');
  console.log(`   - src/environments/environment.${finalKey}.ts`);
  console.log(`   - src/app/core/config/maps.${finalKey}.ts`);
  console.log('   - angular.json (actualizado)');
  console.log('   - territory-routing.module.ts (actualizado)');

  if (initFirebase) {
    console.log('\n🔥 Base de datos Firebase inicializada');
  }

  console.log('\n🚀 Próximos pasos:');
  console.log(`   1. Ejecutar: ng serve --configuration=${finalKey}`);
  console.log('   2. Actualizar los iframes de mapas en:');
  console.log(`      src/app/core/config/maps.${finalKey}.ts`);
  console.log('   3. Configurar las imágenes en Firebase:');
  console.log('      - Colección MapsTerritory');
  console.log('      - Colección Statistics');
  console.log('');
}

// Ejecutar
main().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error);
  process.exit(1);
});
