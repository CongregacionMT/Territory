const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔙 Restoring Initial Territory Documents\n");

  // 1. Verificar Service Account Key
  const serviceAccountPath = path.join(__dirname, "service-account.json");
  if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Error: service-account.json no encontrado");
    process.exit(1);
  }

  // 2. Cargar last-config.json
  const configPath = path.join(__dirname, "last-config.json");
  if (!fs.existsSync(configPath)) {
    console.error("❌ Error: last-config.json no encontrado");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const serviceAccount = require(serviceAccountPath);

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();

  console.log(`🚀 Restore for Congregation: ${config.congregationName}\n`);

  for (const locality of config.localities) {
    console.log(`📍 Locality: ${locality.name}`);

    for (let i = 1; i <= locality.numTerritories; i++) {
      const collectionName = `${locality.territoryPrefix}-${i}`;
      const collectionRef = db.collection(collectionName);

      // Check if collection is empty or missing initial doc
      const snapshot = await collectionRef.where("isInitial", "==", true).get();

      if (snapshot.empty) {
        process.stdout.write(`   Restoring ${collectionName}... `);

        const applesCount = locality.applesPerTerritory[i - 1] || 0;
        const applesData = Array.from({ length: applesCount }, (_, index) => ({
          name: `Manzana ${index + 1}`,
          checked: false,
        }));

        const initialCard = {
          location: locality.key,
          locality: locality.key,
          numberTerritory: i,
          applesData: applesData,
          creation: admin.firestore.Timestamp.now(),
          revision: false,
          completed: 0,
          driver: "",
          start: "",
          end: "",
          comments: "Recuperado por script de restauración",
          link: collectionName,
          isInitial: true,
        };

        await collectionRef.add(initialCard);
        process.stdout.write("✅\n");
      } else {
        console.log(
          `   ⊙ Skipping ${collectionName} (already has initial document)`,
        );
      }
    }
  }

  console.log("\n✨ Restore completed!\n");
}

main().catch((error) => {
  console.error("\n❌ Unexpected error:", error);
  process.exit(1);
});
