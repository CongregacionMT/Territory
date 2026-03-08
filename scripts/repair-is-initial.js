const admin = require("firebase-admin");
const inquirer = require("inquirer");
const fs = require("fs");
const path = require("path");

function loadEnvironmentConfig(congregationFileName) {
  const envPath = path.join(
    __dirname,
    "..",
    "src",
    "environments",
    `environment.${congregationFileName}.ts`,
  );

  if (!fs.existsSync(envPath)) return null;

  const content = fs.readFileSync(envPath, "utf8");
  const config = {
    congregationKey: extractValue(content, "congregationKey"),
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
    localities.push({
      key: extractValue(localityContent, "key"),
      name: extractValue(localityContent, "name"),
      territoryPrefix: extractValue(localityContent, "territoryPrefix"),
    });
  }

  return localities;
}

function findAvailableCongregations() {
  const envDir = path.join(__dirname, "..", "src", "environments");
  if (!fs.existsSync(envDir)) return [];
  return fs
    .readdirSync(envDir)
    .filter(
      (file) =>
        file.startsWith("environment.") &&
        file.endsWith(".ts") &&
        !["environment.prod.ts", "environment.ts"].includes(file),
    )
    .map((file) => file.replace("environment.", "").replace(".ts", ""));
}

async function repairCollection(db, collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();

  let repairedCount = 0;
  const batchSize = 400;
  let batch = db.batch();
  let currentBatchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Si isInitial es true, pero tiene conductor o comentarios o manzanas marcadas, entonces NO es el inicial real
    const hasDriver = data.driver && data.driver.trim() !== "";
    const hasComments =
      data.comments &&
      data.comments.trim() !== "" &&
      data.comments !== "Inicializado por script";
    const hasCheckedApples =
      data.applesData && data.applesData.some((a) => a.checked === true);
    const hasStart = data.start && data.start.trim() !== "";

    if (
      data.isInitial === true &&
      (hasDriver || hasComments || hasCheckedApples || hasStart)
    ) {
      batch.update(doc.ref, { isInitial: false });
      repairedCount++;
      currentBatchCount++;

      if (currentBatchCount >= batchSize) {
        await batch.commit();
        batch = db.batch();
        currentBatchCount = 0;
      }
    }
  }

  if (currentBatchCount > 0) {
    await batch.commit();
  }

  return repairedCount;
}

async function main() {
  console.log("🔧 Script de Reparación de Banderas isInitial\n");

  const serviceAccountPath = path.join(__dirname, "service-account.json");
  if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Error: service-account.json no encontrado.");
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  const db = admin.firestore();
  const availableCongregations = findAvailableCongregations();
  const prompt = inquirer.createPromptModule();

  const { selectedCongregation } = await prompt([
    {
      type: "list",
      name: "selectedCongregation",
      message: "Selecciona la congregación:",
      choices: availableCongregations,
    },
  ]);

  const config = loadEnvironmentConfig(selectedCongregation);

  const { selectedLocalityKey } = await prompt([
    {
      type: "list",
      name: "selectedLocalityKey",
      message: "Selecciona la localidad:",
      choices: config.localities.map((l) => ({ name: l.name, value: l.key })),
    },
  ]);

  const locality = config.localities.find((l) => l.key === selectedLocalityKey);

  const { territoryPrefix } = await prompt([
    {
      type: "input",
      name: "territoryPrefix",
      message: "Prefijo:",
      default: locality.territoryPrefix,
    },
  ]);

  const { start, end } = await prompt([
    { type: "number", name: "start", message: "Desde:", default: 1 },
    { type: "number", name: "end", message: "Hasta:" },
  ]);

  const collections = [];
  for (let i = start; i <= end; i++) {
    collections.push(`${territoryPrefix}-${i}`);
  }

  console.log(`\n🚀 Reparando ${collections.length} colecciones...\n`);

  let totalRepaired = 0;
  for (const coll of collections) {
    process.stdout.write(`   Procesando ${coll}... `);
    try {
      const repaired = await repairCollection(db, coll);
      if (repaired > 0) {
        process.stdout.write(`✅ Reparados: ${repaired}\n`);
        totalRepaired += repaired;
      } else {
        process.stdout.write(`OK (Sin errores)\n`);
      }
    } catch (error) {
      process.stdout.write(`❌ Error: ${error.message}\n`);
    }
  }

  console.log(
    `\n✨ Reparación finalizada. Total de documentos corregidos: ${totalRepaired}\n`,
  );
  console.log(
    "👉 Ahora puedes ejecutar el script de limpieza clean-territories.js\n",
  );
}

main().catch(console.error);
