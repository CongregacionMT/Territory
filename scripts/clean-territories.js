const admin = require("firebase-admin");
const inquirer = require("inquirer");
const fs = require("fs");
const path = require("path");

/**
 * Lee y parsea un archivo de configuración environment
 */
function loadEnvironmentConfig(congregationFileName) {
  const envPath = path.join(
    __dirname,
    "..",
    "src",
    "environments",
    `environment.${congregationFileName}.ts`,
  );

  if (!fs.existsSync(envPath)) {
    return null;
  }

  const content = fs.readFileSync(envPath, "utf8");

  const config = {
    congregationName: extractValue(content, "congregationName"),
    congregationKey: extractValue(content, "congregationKey"),
    territoryPrefix: extractValue(content, "territoryPrefix"),
    localities: extractLocalities(content),
  };

  return config;
}

function extractValue(content, key) {
  const regex = new RegExp(`${key}:\\s*['"]([^'"]+)['"]`);
  const match = content.match(regex);
  return match ? match[1] : null;
}

function extractLocalities(content) {
  const localitiesMatch = content.match(/localities:\s*\[([\s\S]*?)\]/);
  if (!localitiesMatch) return [];

  const localitiesContent = localitiesMatch[1];
  const localities = [];

  const localityRegex = /\{([^}]+)\}/g;
  let match;

  while ((match = localityRegex.exec(localitiesContent)) !== null) {
    const localityContent = match[1];
    const locality = {
      key: extractValue(localityContent, "key"),
      name: extractValue(localityContent, "name"),
      territoryPrefix: extractValue(localityContent, "territoryPrefix"),
      storageKey: extractValue(localityContent, "storageKey"),
      hasNumberedTerritories: localityContent.includes(
        "hasNumberedTerritories: true",
      ),
    };
    localities.push(locality);
  }

  return localities;
}

function findAvailableCongregations() {
  const envDir = path.join(__dirname, "..", "src", "environments");
  if (!fs.existsSync(envDir)) return [];
  const files = fs.readdirSync(envDir);

  return files
    .filter(
      (file) =>
        file.startsWith("environment.") &&
        file.endsWith(".ts") &&
        file !== "environment.prod.ts" &&
        file !== "environment.ts",
    )
    .map((file) => file.replace("environment.", "").replace(".ts", ""));
}

async function deleteCollection(db, collectionPath, batchLimit = 100) {
  const collectionRef = db.collection(collectionPath);
  let lastDoc = null;
  let hasMore = true;

  while (hasMore) {
    let query = collectionRef.limit(batchLimit);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    const batch = db.batch();
    let deletedCount = 0;

    snapshot.docs.forEach((doc) => {
      if (doc.data().isInitial !== true) {
        batch.delete(doc.ref);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      await batch.commit();
    }

    if (snapshot.size < batchLimit) {
      hasMore = false;
    } else {
      lastDoc = snapshot.docs[snapshot.size - 1];
    }
  }
}

async function main() {
  console.log("🧹 Script de Limpieza de Colecciones de Territorios\n");

  // 1. Verificar Service Account Key
  const serviceAccountPath = path.join(__dirname, "service-account.json");
  if (!fs.existsSync(serviceAccountPath)) {
    console.error(
      "❌ Error: service-account.json no encontrado en el directorio scripts/",
    );
    console.log(
      "👉 Por favor descarga tu Firebase Service Account Key desde la Consola de Firebase",
    );
    console.log("   y guárdalo como scripts/service-account.json");
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();

  // 2. Buscar congregaciones disponibles
  const availableCongregations = findAvailableCongregations();
  const prompt = inquirer.createPromptModule();

  if (availableCongregations.length === 0) {
    console.error(
      "❌ Error: No se encontraron archivos de entorno para congregaciones.",
    );
    process.exit(1);
  }

  const { selectedCongregation } = await prompt([
    {
      type: "list",
      name: "selectedCongregation",
      message:
        "Selecciona la congregación a la que hay que limpiarle los territorios:",
      choices: availableCongregations.map((c) => ({ name: c, value: c })),
    },
  ]);

  const config = loadEnvironmentConfig(selectedCongregation);
  if (!config) {
    console.error(
      `❌ Error: No se pudo cargar la configuración de environment.${selectedCongregation}.ts`,
    );
    process.exit(1);
  }

  // 3. Selección de Localidad
  const { selectedLocalityKey } = await prompt([
    {
      type: "list",
      name: "selectedLocalityKey",
      message: "Selecciona la localidad:",
      choices: config.localities.map((l) => ({ name: l.name, value: l.key })),
    },
  ]);

  const locality = config.localities.find((l) => l.key === selectedLocalityKey);

  // 4. Preguntar el prefijo (por defecto el de la localidad)
  const { territoryPrefix } = await prompt([
    {
      type: "input",
      name: "territoryPrefix",
      message: "Confirma el prefijo del territorio:",
      default: locality.territoryPrefix,
    },
  ]);

  // 5. Rango de territorios
  const { start, end } = await prompt([
    {
      type: "number",
      name: "start",
      message: "Desde qué número de territorio limpiar (ej: 1):",
      default: 1,
      validate: (input) => (input > 0 ? true : "Debe ser mayor a 0"),
    },
    {
      type: "number",
      name: "end",
      message: "Hasta qué número de territorio limpiar (ej: 51):",
      validate: (input, answers) =>
        input >= answers.start ? true : "Debe ser mayor o igual al inicio",
    },
  ]);

  const collectionsToClean = [];
  for (let i = start; i <= end; i++) {
    collectionsToClean.push(`${territoryPrefix}-${i}`);
  }

  console.log("\n⚠️  ATENCIÓN: Se van a vaciar las siguientes colecciones:");
  console.log(`   Localidad: ${locality.name}`);
  console.log(
    `   Rango: ${territoryPrefix}-${start} al ${territoryPrefix}-${end}`,
  );
  console.log(`   Total: ${collectionsToClean.length} colecciones\n`);

  const { confirmAction } = await prompt([
    {
      type: "confirm",
      name: "confirmAction",
      message:
        "¿Estás seguro de que deseas proceder? Esta acción borrará TODOS los documentos en estas colecciones.",
      default: false,
    },
  ]);

  if (!confirmAction) {
    console.log("\n❌ Operación cancelada por el usuario.");
    process.exit(0);
  }

  console.log("\n🚀 Iniciando limpieza...\n");

  for (const collectionName of collectionsToClean) {
    process.stdout.write(`   Limpiando ${collectionName}... `);
    try {
      await deleteCollection(db, collectionName);
      process.stdout.write("✅\n");
    } catch (error) {
      process.stdout.write(`❌ Error: ${error.message}\n`);
    }
  }

  console.log("\n✨ ¡Limpieza completada!\n");
}

main().catch((error) => {
  console.error("\n❌ Error inesperado:", error);
  process.exit(1);
});
