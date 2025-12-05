const admin = require('firebase-admin');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

/**
 * Lee y parsea un archivo de configuración environment
 */
function loadEnvironmentConfig(congregationFileName) {
  const envPath = path.join(__dirname, '..', 'src', 'environments', `environment.${congregationFileName}.ts`);
  
  if (!fs.existsSync(envPath)) {
    return null;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  
  // Extraer configuración usando regex (simple parsing)
  const config = {
    congregationName: extractValue(content, 'congregationName'),
    congregationKey: extractValue(content, 'congregationKey'),
    territoryPrefix: extractValue(content, 'territoryPrefix'),
    localities: extractLocalities(content)
  };

  return config;
}

/**
 * Extrae un valor simple de una línea del archivo
 */
function extractValue(content, key) {
  const regex = new RegExp(`${key}:\\s*['"]([^'"]+)['"]`);
  const match = content.match(regex);
  return match ? match[1] : null;
}

/**
 * Extrae el array de localities del archivo
 */
function extractLocalities(content) {
  const localitiesMatch = content.match(/localities:\s*\[([\s\S]*?)\]/);
  if (!localitiesMatch) return [];

  const localitiesContent = localitiesMatch[1];
  const localities = [];
  
  // Buscar cada objeto de localidad
  const localityRegex = /\{([^}]+)\}/g;
  let match;
  
  while ((match = localityRegex.exec(localitiesContent)) !== null) {
    const localityContent = match[1];
    const locality = {
      key: extractValue(localityContent, 'key'),
      name: extractValue(localityContent, 'name'),
      territoryPrefix: extractValue(localityContent, 'territoryPrefix'),
      storageKey: extractValue(localityContent, 'storageKey'),
      hasNumberedTerritories: localityContent.includes('hasNumberedTerritories: true')
    };
    localities.push(locality);
  }

  return localities;
}

/**
 * Busca todos los archivos de configuración disponibles
 */
function findAvailableCongregations() {
  const envDir = path.join(__dirname, '..', 'src', 'environments');
  const files = fs.readdirSync(envDir);
  
  const congregations = files
    .filter(file => file.startsWith('environment.') && file.endsWith('.ts') && file !== 'environment.prod.ts')
    .map(file => file.replace('environment.', '').replace('.ts', ''));
  
  return congregations;
}

async function main() {
  console.log('🚀 Aplicación de Territorios - Script de Inicialización de Base de Datos\n');

  // 1. Verificar Service Account Key
  const serviceAccountPath = path.join(__dirname, 'service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: service-account.json no encontrado en el directorio scripts/');
    console.log('👉 Por favor descarga tu Firebase Service Account Key desde la Consola de Firebase');
    console.log('   (Configuración del Proyecto > Cuentas de servicio > Generar nueva clave privada)');
    console.log('   y guárdalo como scripts/service-account.json');
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const db = admin.firestore();

  // 2. Buscar congregaciones disponibles
  const availableCongregations = findAvailableCongregations();
  const prompt = inquirer.createPromptModule();

  const choices = [
    ...availableCongregations.map(c => ({ name: c, value: c })),
    new inquirer.Separator(),
    { name: '[Crear nueva congregación]', value: 'new' }
  ];

  const { selectedCongregation } = await prompt([
    {
      type: 'list',
      name: 'selectedCongregation',
      message: 'Selecciona la congregación:',
      choices: choices
    }
  ]);

  let config;
  let congregationFileName;

  if (selectedCongregation === 'new') {
    // Modo manual para nueva congregación
    console.log('\n📝 Creando nueva congregación (modo manual)\n');
    const manualConfig = await prompt([
      {
        type: 'input',
        name: 'congregationKey',
        message: 'Ingresa la clave de la congregación (ej: wheelwright, mariaTeresa):',
        validate: input => input.length > 0 ? true : 'La clave no puede estar vacía'
      },
      {
        type: 'input',
        name: 'congregationName',
        message: 'Ingresa el nombre de la congregación:',
        validate: input => input.length > 0 ? true : 'El nombre no puede estar vacío'
      },
      {
        type: 'input',
        name: 'territoryPrefix',
        message: 'Ingresa el prefijo de territorio (ej: TerritorioW, TerritorioMT):',
        default: 'Territorio'
      }
    ]);

    config = {
      congregationName: manualConfig.congregationName,
      congregationKey: manualConfig.congregationKey,
      territoryPrefix: manualConfig.territoryPrefix,
      localities: [{
        key: manualConfig.congregationKey,
        name: manualConfig.congregationName,
        territoryPrefix: manualConfig.territoryPrefix,
        storageKey: `registerStatisticData${manualConfig.territoryPrefix}`,
        hasNumberedTerritories: true
      }]
    };
  } else {
    // Cargar configuración desde archivo
    congregationFileName = selectedCongregation;
    config = loadEnvironmentConfig(congregationFileName);
    
    if (!config) {
      console.error(`❌ Error: No se pudo cargar la configuración de environment.${congregationFileName}.ts`);
      process.exit(1);
    }

    console.log(`\n✓ Congregación seleccionada: ${config.congregationName}`);
    console.log(`✓ Configuración cargada desde environment.${congregationFileName}.ts`);
    console.log(`✓ Localidades detectadas: ${config.localities.length}`);
    config.localities.forEach(loc => {
      console.log(`  - ${loc.name} (${loc.territoryPrefix})${!loc.hasNumberedTerritories ? ' [sin numeración]' : ''}`);
    });
    console.log('');
  }

  // 3. Configurar cada localidad
  const localitiesData = [];

  for (const locality of config.localities) {
    console.log(`\n📍 Configurando localidad: ${locality.name}`);
    
    if (!locality.hasNumberedTerritories) {
      console.log(`ℹ  Esta localidad no tiene territorios numerados`);
      const { numTerritories } = await prompt([
        {
          type: 'number',
          name: 'numTerritories',
          message: `¿Cuántos territorios crear para ${locality.name}?`,
          default: 5,
          validate: input => input > 0 ? true : 'Debe ser mayor a 0'
        }
      ]);

      localitiesData.push({
        locality,
        numTerritories,
        applesPerTerritory: Array(numTerritories).fill(0) // Sin manzanas para territorios no numerados
      });
      continue;
    }

    const { numTerritories, defaultApples } = await prompt([
      {
        type: 'number',
        name: 'numTerritories',
        message: `¿Cuántos territorios numerados crear para ${locality.name}?`,
        default: 10,
        validate: input => input > 0 ? true : 'Debe ser mayor a 0'
      },
      {
        type: 'number',
        name: 'defaultApples',
        message: 'Número de manzanas por defecto:',
        default: 4,
        validate: input => input > 0 ? true : 'Debe ser mayor a 0'
      }
    ]);

    // Preguntar manzanas por cada territorio
    const applesPerTerritory = [];
    for (let i = 1; i <= numTerritories; i++) {
      const { apples } = await prompt([
        {
          type: 'number',
          name: 'apples',
          message: `  Manzanas para territorio ${i}:`,
          default: defaultApples,
          validate: input => input > 0 ? true : 'Debe ser mayor a 0'
        }
      ]);
      applesPerTerritory.push(apples);
    }

    localitiesData.push({
      locality,
      numTerritories,
      applesPerTerritory
    });
  }

  // 4. Crear territorios en la base de datos
  console.log('\n📦 Inicializando territorios en la base de datos...\n');

  for (const localityData of localitiesData) {
    const { locality, numTerritories, applesPerTerritory } = localityData;
    
    console.log(`   Procesando ${locality.name}...`);

    for (let i = 1; i <= numTerritories; i++) {
      const collectionName = `${locality.territoryPrefix} ${i}`;
      const collectionRef = db.collection(collectionName);
      const existingDocs = await collectionRef.limit(1).get();

      if (existingDocs.empty) {
        const applesData = Array.from(
          { length: applesPerTerritory[i - 1] || 0 }, 
          () => ({ name: '', checked: false })
        );

        const initialCard = {
          location: locality.key,
          locality: locality.key, // Agregar referencia a la localidad
          numberTerritory: i,
          applesData: applesData,
          creation: admin.firestore.Timestamp.now(),
          revision: false,
          completed: 0,
          driver: '',
          start: '',
          end: '',
          comments: 'Inicializado por script',
          link: ''
        };

        await collectionRef.add(initialCard);
        console.log(`      ✓ Creado: ${collectionName}`);
      } else {
        console.log(`      ⊙ Ya existe: ${collectionName}`);
      }
    }
  }

  // 5. Asegurar que existe el usuario admin
  const usersRef = db.collection('users');
  await usersRef.doc('admin').set({
    user: 'admin',
    password: 'admin2026',
    rol: 'admin'
  }, { merge: true });

  // 6. Resumen final
  console.log('\n\n✅ ¡Completado!');
  console.log(`   - Congregación: ${config.congregationName}`);
  localitiesData.forEach(ld => {
    console.log(`   - Creados ${ld.numTerritories} territorios para ${ld.locality.name}`);
  });
  console.log(`   - Usuario admin creado/actualizado`);
  console.log('');
}

// Ejecutar main
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
