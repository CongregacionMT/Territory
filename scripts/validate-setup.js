const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * Script de validación de prerrequisitos
 * Verifica que todo esté listo antes de ejecutar setup-congregation.js
 */

// Ejecución del script: node scripts/validate-setup.js

console.log("🔍 Validando prerrequisitos para setup-congregation.js\n");

let allGood = true;

// 1. Verificar Node.js version
console.log("1. Verificando versión de Node.js...");
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);
if (majorVersion >= 14) {
  console.log(`   ✓ Node.js ${nodeVersion} (OK)\n`);
} else {
  console.log(`   ❌ Node.js ${nodeVersion} (Se requiere v14 o superior)\n`);
  allGood = false;
}

// 2. Verificar dependencias
console.log("2. Verificando dependencias NPM...");
try {
  require("firebase-admin");
  console.log("   ✓ firebase-admin instalado");
} catch (e) {
  console.log("   ❌ firebase-admin NO instalado");
  console.log("      Ejecuta: npm install firebase-admin");
  allGood = false;
}

try {
  require("inquirer");
  console.log("   ✓ inquirer instalado\n");
} catch (e) {
  console.log("   ❌ inquirer NO instalado");
  console.log("      Ejecuta: npm install inquirer\n");
  allGood = false;
}

// 3. Verificar estructura de directorios
console.log("3. Verificando estructura de directorios...");
const requiredDirs = [
  path.join(__dirname, "..", "src", "environments"),
  path.join(__dirname, "..", "src", "app", "core", "config"),
  path.join(__dirname, "..", "src", "app", "modules", "territory"),
];

let dirsOk = true;
requiredDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    console.log(`   ✓ ${path.basename(dir)}/`);
  } else {
    console.log(`   ❌ ${dir} NO existe`);
    dirsOk = false;
    allGood = false;
  }
});
if (dirsOk) console.log("");

// 4. Verificar archivos críticos
console.log("4. Verificando archivos críticos...");
const requiredFiles = [
  { path: path.join(__dirname, "..", "angular.json"), name: "angular.json" },
  {
    path: path.join(
      __dirname,
      "..",
      "src",
      "app",
      "modules",
      "territory",
      "territory-routing.module.ts",
    ),
    name: "territory-routing.module.ts",
  },
  {
    path: path.join(__dirname, "setup-congregation.js"),
    name: "setup-congregation.js",
  },
];

let filesOk = true;
requiredFiles.forEach((file) => {
  if (fs.existsSync(file.path)) {
    console.log(`   ✓ ${file.name}`);
  } else {
    console.log(`   ❌ ${file.name} NO existe`);
    filesOk = false;
    allGood = false;
  }
});
if (filesOk) console.log("");

// 5. Verificar Service Account (opcional pero recomendado)
console.log("5. Verificando Service Account Key...");
const serviceAccountPath = path.join(__dirname, "service-account.json");
if (fs.existsSync(serviceAccountPath)) {
  console.log("   ✓ service-account.json encontrado");
  console.log("   ℹ  Podrás inicializar Firebase durante el setup\n");
} else {
  console.log("   ⚠  service-account.json NO encontrado");
  console.log("   ℹ  Podrás configurar archivos, pero no inicializar Firebase");
  console.log(
    "   👉 Descárgalo desde Firebase Console > Configuración > Cuentas de servicio\n",
  );
}

// 6. Verificar que angular.json es válido JSON
console.log("6. Verificando formato de angular.json...");
try {
  const angularJsonPath = path.join(__dirname, "..", "angular.json");
  const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, "utf8"));
  console.log("   ✓ angular.json tiene formato JSON válido\n");
} catch (e) {
  console.log("   ❌ angular.json tiene errores de formato");
  console.log(`      Error: ${e.message}\n`);
  allGood = false;
}

// 7. Verificar Login de Firebase
console.log("7. Verificando autenticación de Firebase...");
try {
  // Primero verificamos si hay sesión de forma no interactiva (esto es lo más fiable)
  execSync("firebase projects:list --non-interactive", {
    shell: true,
    stdio: "ignore",
  });

  // Si llegamos aquí, hay sesión. Intentamos obtener el email para información (opcional)
  try {
    const output = execSync("firebase login", {
      encoding: "utf8",
      shell: true,
      stdio: ["ignore", "pipe", "ignore"],
    });

    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const match = output.match(emailRegex);

    if (match) {
      console.log(`   ✓ Sesión activa como: ${match[1]}\n`);
    } else {
      console.log("   ✓ Sesión activa detectada\n");
    }
  } catch (e) {
    // Si falla el login pero proyectos pasó, solo informamos sesión activa
    console.log("   ✓ Sesión activa detectada\n");
  }
} catch (e) {
  console.log("   ❌ No se detectó una sesión activa de Firebase");
  console.log("      Asegúrate de haber ejecutado: firebase login");
  console.log(
    `      Detalle: ${e.message.split("\n")[0].substring(0, 100)}...\n`,
  );
  allGood = false;
}

// 8. Recordatorio de Cloud Firestore API
console.log("8. Recordatorio de Cloud Firestore API...");
console.log(
  "   ⚠  IMPORTANTE: Asegúrate de haber habilitado 'Cloud Firestore API'",
);
console.log("   👉 En: https://console.cloud.google.com\n");

// Resumen final
console.log("═══════════════════════════════════════════════════════\n");
if (allGood) {
  console.log("✅ ¡TODO LISTO! Puedes ejecutar el script de setup:\n");
  console.log("   node scripts/setup-congregation.js\n");
  console.log("📚 Para más información, consulta:");
  console.log("   scripts/README-SETUP.md\n");
} else {
  console.log("❌ Hay problemas que debes resolver antes de continuar.\n");
  console.log("📝 Revisa los errores arriba y corrígelos.\n");
  console.log("📚 Para más ayuda, consulta:");
  console.log("   scripts/README-SETUP.md\n");
  process.exit(1);
}
