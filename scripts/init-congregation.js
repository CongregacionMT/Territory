const admin = require('firebase-admin');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🚀 Territory App - Database Initialization Script');

  // 1. Check for Service Account Key
  const serviceAccountPath = path.join(__dirname, 'service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: service-account.json not found in scripts/ directory.');
    console.log('👉 Please download your Firebase Service Account Key from the Firebase Console');
    console.log('   (Project Settings > Service accounts > Generate new private key)');
    console.log('   and save it as scripts/service-account.json');
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const db = admin.firestore();

  // 2. Prompt for details
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'congregationKey',
      message: 'Enter the Congregation Key (e.g., wheelwright, urbano):',
      validate: input => input.length > 0 ? true : 'Key cannot be empty'
    },
    {
      type: 'input',
      name: 'territoryPrefix',
      message: 'Enter the Territory Prefix (e.g., TerritorioW, TerritorioUrbano):',
      default: 'Territorio'
    },
    {
      type: 'number',
      name: 'numTerritories',
      message: 'How many territories do you want to create?',
      validate: input => input > 0 ? true : 'Must be greater than 0'
    },
    {
      type: 'number',
      name: 'defaultApples',
      message: 'Default number of blocks (manzanas) per territory:',
      default: 4
    }
  ]);

  const { congregationKey, territoryPrefix, numTerritories, defaultApples } = answers;

  console.log(`\n📦 Initializing ${numTerritories} territories for '${congregationKey}'...`);

  // 3. Update NumberTerritory
  // We assume there is a single document in 'NumberTerritory' collection that holds the arrays.
  // Let's find it or create one.
  const numberTerritoryRef = db.collection('NumberTerritory');
  const snapshot = await numberTerritoryRef.limit(1).get();
  
  let docRef;
  let data = {};

  if (snapshot.empty) {
    console.log('   Creating new NumberTerritory document...');
    docRef = numberTerritoryRef.doc('list'); // Use a fixed ID 'list' or auto-generated
    await docRef.set({});
  } else {
    docRef = snapshot.docs[0].ref;
    data = snapshot.docs[0].data();
    console.log(`   Updating existing NumberTerritory document (${docRef.id})...`);
  }

  const territoryList = [];

  // 4. Create Territory Collections and Data
  for (let i = 1; i <= numTerritories; i++) {
    const collectionName = `${territoryPrefix} ${i}`;
    
    // Add to list
    territoryList.push({
      collection: collectionName,
      territorio: i
    });

    // Create initial card in the collection
    // We check if collection exists/has docs to avoid overwriting? 
    // The user said "add base data". We'll add an initial "Unassigned" card.
    
    const collectionRef = db.collection(collectionName);
    const existingDocs = await collectionRef.limit(1).get();

    if (existingDocs.empty) {
      const applesData = Array.from({ length: defaultApples }, () => ({ name: '', checked: false }));
      
      const initialCard = {
        location: congregationKey, // or Name?
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

      // Create a document. ID can be auto-generated or timestamp based like in the app.
      // The app uses `Campaña-${activeCampaign?.id}-${Date.now()}`.
      // We'll use a generic ID.
      await collectionRef.add(initialCard);
      process.stdout.write('.');
    } else {
      process.stdout.write('s'); // skip
    }
  }

  // Update the NumberTerritory document with the new list
  await docRef.update({
    [congregationKey]: territoryList
  });

  console.log('\n\n✅ Done!');
  console.log(`   - Added/Updated '${congregationKey}' in NumberTerritory.`);
  console.log(`   - Created/Checked ${numTerritories} territory collections.`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
