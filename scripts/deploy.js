const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

/**
 * Lee y parsea un archivo de configuración environment para obtener el projectId
 */

// ejecutar script: node scripts/deploy.js

function loadEnvironmentConfig(congregationFileName) {
  const envPath = path.join(
    __dirname,
    '..',
    'src',
    'environments',
    `environment.${congregationFileName}.ts`,
  );

  if (!fs.existsSync(envPath)) {
    return null;
  }

  const content = fs.readFileSync(envPath, 'utf8');

  // Extraer projectId usando regex
  const projectIdMatch = content.match(/projectId:\s*['"]([^'"]+)['"]/);
  const projectId = projectIdMatch ? projectIdMatch[1] : null;

  // Extraer hostingSite opcional
  const hostingSiteMatch = content.match(/hostingSite:\s*['"]([^'"]+)['"]/);
  const hostingSite = hostingSiteMatch ? hostingSiteMatch[1] : null;

  return {
    projectId,
    hostingSite,
  };
}

const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const VERSION_FIELD_PATTERN = /("version"\s*:\s*")([^"]+)(")/;

/**
 * Lee la versión actual desde package.json
 */
function readPackageVersion() {
  const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
  const match = content.match(VERSION_FIELD_PATTERN);
  if (!match) {
    throw new Error('No se encontró el campo "version" en package.json');
  }
  return match[2];
}

/**
 * Escribe la versión en package.json sin alterar el resto del formato del archivo
 */
function writePackageVersion(version) {
  const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
  fs.writeFileSync(PACKAGE_JSON_PATH, content.replace(VERSION_FIELD_PATTERN, `$1${version}$3`));
}

/**
 * Pregunta si se mantiene la versión actual o se define una nueva.
 * Devuelve la versión elegida (puede ser la misma que la actual).
 */
async function askVersion(prompt, currentVersion) {
  const { keepVersion } = await prompt([
    {
      type: 'confirm',
      name: 'keepVersion',
      message: `La versión actual es ${currentVersion}. ¿Mantenerla? (No = ingresar una nueva)`,
      default: true,
    },
  ]);

  if (keepVersion) {
    return currentVersion;
  }

  const { newVersion } = await prompt([
    {
      type: 'input',
      name: 'newVersion',
      message: 'Nueva versión (formato X.Y.Z):',
      validate: (value) =>
        VERSION_PATTERN.test(value.trim()) || 'Formato inválido. Ejemplo: 3.1.0',
    },
  ]);

  return newVersion.trim();
}

/**
 * Commitea únicamente package.json con la nueva versión y lo sube a la rama actual.
 * Se ejecuta recién después de un deploy exitoso. Nunca usa --no-verify: si un hook falla,
 * el deploy ya está hecho y se informa para resolverlo a mano.
 */
function commitAndPushVersion(version) {
  const git = (...args) => execFileSync('git', args, { stdio: 'inherit' });
  const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

  git('add', 'package.json');
  // "-- package.json" limita el commit a ese archivo aunque haya otros cambios en staging
  git('commit', '-m', `chore(release): v${version}`, '--', 'package.json');
  git('push', '-u', 'origin', branch);
  console.log(`\n✓ Versión ${version} commiteada y subida a "${branch}"`);
}

/**
 * Busca todos los archivos de configuración disponibles
 */
function findAvailableCongregations() {
  const envDir = path.join(__dirname, '..', 'src', 'environments');
  const files = fs.readdirSync(envDir);

  const congregations = files
    .filter(
      (file) =>
        file.startsWith('environment.') &&
        file.endsWith('.ts') &&
        file !== 'environment.prod.ts' &&
        file !== 'environment.ts',
    )
    .map((file) => file.replace('environment.', '').replace('.ts', ''));

  return congregations;
}

async function main() {
  console.log('🚀 Script de Despliegue Multi-Congregación\n');

  // 1. Buscar congregaciones disponibles
  const availableCongregations = findAvailableCongregations();

  if (availableCongregations.length === 0) {
    console.error('❌ No se encontraron configuraciones de congregación en src/environments/');
    process.exit(1);
  }

  const prompt = inquirer.createPromptModule();

  let continueDeploying = true;

  while (continueDeploying) {
    const { selectedCongregation } = await prompt([
      {
        type: 'select',
        name: 'selectedCongregation',
        message: 'Selecciona la congregación para desplegar:',
        choices: availableCongregations,
      },
    ]);

  // 2. Obtener configuración
  const config = loadEnvironmentConfig(selectedCongregation);

  if (!config || !config.projectId) {
    console.error(
      `❌ Error: No se pudo obtener el 'projectId' de environment.${selectedCongregation}.ts`,
    );
    console.log('Asegúrate de que la propiedad firebase.projectId esté definida en el archivo.');
    process.exit(1);
  }

  console.log(`\n✓ Congregación: ${selectedCongregation}`);
  console.log(`✓ Firebase Project ID: ${config.projectId}`);
  console.log(`✓ Configuración Angular: ${selectedCongregation}\n`);

  // 3. Confirmar acción
  const { confirm } = await prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `¿Configurar el entorno, construir y desplegar para ${selectedCongregation}?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log('Operación cancelada para esta congregación.');
  } else {

  // Versión: se pregunta antes del build porque queda embebida en la app (se muestra en el home)
  const previousVersion = readPackageVersion();
  const version = await askVersion(prompt, previousVersion);
  const versionChanged = version !== previousVersion;
  if (versionChanged) {
    writePackageVersion(version);
    console.log(`\n✓ Versión actualizada en package.json: ${previousVersion} → ${version}`);
  }

  let deployed = false;

  try {
    // 4. Configurar firebase.json dinámicamente
    console.log('\n📝 Actualizando configuración de firebase.json...');
    const firebaseJsonPath = path.join(__dirname, '..', 'firebase.json');
    let firebaseJson;

    try {
      firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
    } catch (e) {
      console.error('❌ Error leyendo firebase.json:', e);
      process.exit(1);
    }

    // Validar estructura simple de hosting
    if (Array.isArray(firebaseJson.hosting)) {
      console.error(
        '❌ Error: El script espera un objeto simple en "hosting", pero encontró un array.',
      );
      process.exit(1);
    }

    if (config.hostingSite) {
      console.log(`   Estableciendo "site": "${config.hostingSite}"`);
      firebaseJson.hosting.site = config.hostingSite;
    } else {
      console.log('   Usando sitio por defecto del proyecto ("site" eliminado)');
      delete firebaseJson.hosting.site;
    }

    fs.writeFileSync(firebaseJsonPath, JSON.stringify(firebaseJson, null, 2));

    // 5. Build de Angular
    console.log('\n🔨 Construyendo la aplicación (Angular Build)...');
    const buildDate = new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
    const buildCmd = `npx ng build --configuration=${selectedCongregation} --define 'APP_BUILD_DATE="${buildDate}"'`;
    console.log(`> ${buildCmd}`);

    execSync(buildCmd, { stdio: 'inherit' });

    // 6. Verificar sesión de Firebase
    console.log('\n🔍 Verificando usuario de Firebase...');
    let currentUser = 'Desconocido';
    try {
      const authOutput = execSync('npx --yes firebase-tools login:list', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const match = authOutput.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
      if (match) {
        currentUser = match[1];
      }
    } catch (e) {
      // Ignorar si falla, puede que no haya sesión
    }

    const { confirmUser } = await prompt([
      {
        type: 'confirm',
        name: 'confirmUser',
        message: `El usuario actual de Firebase parece ser "${currentUser}". ¿Estás seguro de que quieres usar este usuario para desplegar?`,
        default: true,
      }
    ]);

    if (!confirmUser) {
      console.log('\nCerrando sesión actual...');
      try {
        execSync('npx --yes firebase-tools logout', { stdio: 'inherit' });
      } catch(e) {
        console.log('Error al cerrar sesión o no había sesión activa.');
      }
      console.log('\nPor favor, inicia sesión con el usuario correcto:');
      execSync('npx --yes firebase-tools login', { stdio: 'inherit' });
    }

    // 7. Deploy a Firebase
    console.log('\n🔥 Desplegando a Firebase Hosting...');

    // Ya no necesitamos flags especiales porque el target está en firebase.json
    const deployCmd = `npx firebase deploy --project ${config.projectId}`;

    console.log(`> ${deployCmd}`);

    execSync(deployCmd, { stdio: 'inherit' });
    deployed = true;

    console.log(`\n✅ ¡Despliegue completado con éxito! Versión ${version}`);
  } catch (error) {
    console.error('\n❌ Error durante el proceso de despliegue.');
    if (versionChanged) {
      writePackageVersion(previousVersion);
      console.log(`↩️  Versión restaurada en package.json: ${version} → ${previousVersion}`);
    }
    // El error ya se habrá mostrado en stdio: inherit
  }

  // 8. Registrar la versión en git (solo si el deploy salió bien y la versión cambió)
  if (deployed && versionChanged) {
    const { confirmCommit } = await prompt([
      {
        type: 'confirm',
        name: 'confirmCommit',
        message: `¿Commitear y pushear package.json con la versión ${version}?`,
        default: true,
      },
    ]);

    if (confirmCommit) {
      try {
        commitAndPushVersion(version);
      } catch (error) {
        console.error(
          `\n⚠️  El deploy fue exitoso, pero falló el commit/push de la versión ${version}.`,
        );
        console.error('   package.json conserva la nueva versión: commitéala manualmente.');
      }
    }
  }
  } // fin del else (!confirm)

  const { deployAnother } = await prompt([
    {
      type: 'confirm',
      name: 'deployAnother',
      message: '¿Quieres desplegar otra congregación?',
      default: false,
    }
  ]);
  continueDeploying = deployAnother;
  
  if (continueDeploying) {
    console.log('\n------------------------------------------------------------\n');
  }
 }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
