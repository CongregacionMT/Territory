# Territory App - Guía de Configuración

Este proyecto es una aplicación para la gestión de territorios de congregación.

## 🚀 Configuración de Nueva Congregación

### 📋 Prerrequisitos Críticos

Antes de comenzar, es **obligatorio** realizar estos pasos, de lo contrario la configuración fallará:

1.  **Firebase Login**: Asegúrate de estar logueado con la cuenta de Google que tiene acceso al proyecto de Firebase de la congregación.
    ```bash
    firebase login
    ```
2.  **Habilitar Firestore API**: Debes habilitar la API de Cloud Firestore para tu proyecto en la consola de Google Cloud:
    👉 [console.cloud.google.com](https://console.cloud.google.com)
    _(Busca "Cloud Firestore API" y haz clic en "Habilitar")_

### Método Automatizado (Recomendado)

Una vez cumplidos los prerrequisitos, usa el script automatizado:

```bash
# 1. Valida que todo esté listo
node scripts/validate-setup.js

# 2. Ejecuta el script de configuración
node scripts/setup-congregation.js
```

**El script automáticamente:**

- ✅ Crea archivos de entorno (`environment.*.ts`)
- ✅ Crea archivos de configuración de mapas (`maps.*.ts`)
- ✅ Actualiza `angular.json` con las nuevas configuraciones
- ✅ Actualiza `territory-routing.module.ts` con las rutas
- ✅ Actualiza `assignment-record-routing.module.ts` con las rutas
- ✅ Inicializa Firebase con todas las colecciones necesarias:
  - **Territorios**: Colecciones con manzanas numeradas (`Manzana 1`, `Manzana 2`, etc.)
  - **MapsTerritory**: Configuración de mapas por localidad
  - **Statistics**: Configuración de estadísticas
  - **NumberTerritory**: Índice de territorios
  - **Departures**: Sistema de salidas
  - **Cart**: Sistema de carrito
  - **users**: Usuario admin (admin/admin2026)

**📖 Documentación completa**: Ver [`scripts/README-SETUP.md`](scripts/README-SETUP.md)

**Después de ejecutar el script:**

1. Actualiza los iframes de mapas en `src/app/core/config/maps.*.ts`
2. Configura las imágenes en Firebase Console (MapsTerritory y Statistics)
3. Prueba la aplicación: `ng serve --configuration=[congregacionKey]`

---

### 📝 Método Manual (Avanzado)

Si prefieres configurar manualmente o necesitas personalización adicional:

<details>
<summary>Ver instrucciones manuales</summary>

#### 1. Configuración del Entorno

1.  **Duplicar Archivo de Entorno**:
    Copia el archivo `src/environments/environment.wheelwright.ts` y renómbralo con el nombre de la nueva congregación (ej. `environment.micongregacion.ts`).

2.  **Editar Variables**:
    Abre el nuevo archivo y actualiza los valores:

    ```typescript
    export const environment = {
      firebase: {
        apiKey: "...",
        authDomain: "...",
        projectId: "...",
        // ... resto de la configuración de Firebase
      },
      production: true,
      congregationName: "Mi Congregación",
      congregationKey: "micongregacion",
      territoryPrefix: "TerritorioMC",
      localities: [
        {
          key: "micongregacion",
          name: "Mi Congregación",
          territoryPrefix: "TerritorioMC",
          storageKey: "registerStatisticDataTerritorioMC",
          hasNumberedTerritories: true,
        },
      ],
    };
    ```

3.  **Configuración de Mapas**:
    Crea un archivo `src/app/core/config/maps.micongregacion.ts` (copia de `maps.wheelwright.ts`) y define las URLs de los mapas para cada territorio.

4.  **Actualizar Rutas**:

    Modificar `src/app/modules/territory/territory-routing.module.ts`:

    ```typescript
    { path: 'micongregacion', component: MapasComponent},
    ```

    Modificar `src/app/modules/assignment-record/assignment-record-routing.module.ts`:

    ```typescript
    { path: 'micongregacion', component: TerritoryAssignmentComponent},
    ```

#### 2. Configuración de Angular (`angular.json`)

Agrega una nueva configuración en `angular.json` bajo `architect.build.configurations`:

```json
"micongregacion": {
  "fileReplacements": [
    {
      "replace": "src/environments/environment.ts",
      "with": "src/environments/environment.micongregacion.ts"
    },
    {
      "replace": "src/app/core/config/maps.config.ts",
      "with": "src/app/core/config/maps.micongregacion.ts"
    }
  ],
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "1mb",
      "maximumError": "2mb"
    },
    {
      "type": "anyComponentStyle",
      "maximumWarning": "2kb",
      "maximumError": "6kb"
    }
  ],
  "outputHashing": "all"
}
```

Recuerda agregar también la configuración en `architect.serve.configurations`:

```json
"micongregacion": {
  "buildTarget": "territory:build:micongregacion"
}
```

#### 3. Inicialización de Base de Datos

Usa el script de inicialización:

```bash
node scripts/init-congregation.js
```

</details>

---

## 🧪 Ejecutar la Aplicación

Para probar una congregación específica:

```bash
ng serve --configuration=[congregacionKey]
```

Ejemplos:

```bash
ng serve --configuration=wheelwright
ng serve --configuration=hughes
ng serve --configuration=mariaTeresa
```

---

## 📦 Despliegue

Cada congregación tiene su propio proyecto de Firebase y configuración.

### Pasos para desplegar:

1. Ejecuta el script de despliegue:

   ```bash
   node scripts/deploy.js
   ```

2. **Selecciona la congregación**: El script te mostrará una lista de las congregaciones configuradas.

3. **Confirmación**: El script leerá automáticamente el `projectId` de Firebase y te pedirá confirmación.

4. **Proceso Automático**:
   - Compilará la aplicación: `ng build --configuration=...`
   - Desplegará a Firebase: `firebase deploy --project ...`

> **Nota**: Asegúrate de estar logueado en Firebase (`firebase login`) y tener permisos sobre los proyectos.

---

## 📚 Documentación Adicional

- **Setup Automatizado**: [`scripts/README-SETUP.md`](scripts/README-SETUP.md)
- **Validación de Prerrequisitos**: `node scripts/validate-setup.js`
