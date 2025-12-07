const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Lee y parsea un archivo de configuración environment para obtener el projectId
 */
function loadEnvironmentConfig(congregationFileName) {
  const envPath = path.join(__dirname, '..', 'src', 'environments', `environment.${congregationFileName}.ts`);
  
  if (!fs.existsSync(envPath)) {
    return null;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  
  // Extraer projectId usando regex
  const projectIdMatch = content.match(/projectId:\s*['"]([^'"]+)['"]/);
  const projectId = projectIdMatch ? projectIdMatch[1] : null;

  return {
    projectId
  };
}

/**
 * Busca todos los archivos de configuración disponibles
 */
function findAvailableCongregations() {
  const envDir = path.join(__dirname, '..', 'src', 'environments');
  const files = fs.readdirSync(envDir);
  
  const congregations = files
    .filter(file => file.startsWith('environment.') && file.endsWith('.ts') && file !== 'environment.prod.ts' && file !== 'environment.ts')
    .map(file => file.replace('environment.', '').replace('.ts', ''));
  
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

  const { selectedCongregation } = await prompt([
    {
      type: 'list',
      name: 'selectedCongregation',
      message: 'Selecciona la congregación para desplegar:',
      choices: availableCongregations
    }
  ]);

  // 2. Obtener configuración
  const config = loadEnvironmentConfig(selectedCongregation);
  
  if (!config || !config.projectId) {
    console.error(`❌ Error: No se pudo obtener el 'projectId' de environment.${selectedCongregation}.ts`);
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
      default: false
    }
  ]);

  if (!confirm) {
    console.log('Operación cancelada.');
    process.exit(0);
  }

  try {
    // 4. Build de Angular
    console.log('\n🔨 Construyendo la aplicación (Angular Build)...');
    console.log(`> ng build --configuration=${selectedCongregation}`);
    
    execSync(`npx ng build --configuration=${selectedCongregation}`, { stdio: 'inherit' });
    
    // 5. Deploy a Firebase
    console.log('\n🔥 Desplegando a Firebase Hosting...');
    console.log(`> firebase deploy --project ${config.projectId}`);
    
    execSync(`npx firebase deploy --project ${config.projectId}`, { stdio: 'inherit' });

    console.log('\n✅ ¡Despliegue completado con éxito!');

  } catch (error) {
    console.error('\n❌ Error durante el proceso de despliegue.');
    // El error ya se habrá mostrado en stdio: inherit
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
