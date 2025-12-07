# Territory App - Guía de Configuración

Este proyecto es una aplicación Angular para la gestión de territorios de congregación.

## Agregar una Nueva Congregación

### 1. Configuración del Entorno

1.  **Duplicar Archivo de Entorno**:
    Copia el archivo `src/environments/environment.wheelwright.ts` y renómbralo con el nombre de la nueva congregación (ej. `environment.micongregacion.ts`).

2.  **Editar Variables**:
    Abre el nuevo archivo y actualiza los valores:
    ```typescript
    export const environment = {
      // ... config de firebase ...
      production: true,
      congregationName: 'Mi Congregación',
      congregationKey: 'micongregacion', // Clave única para la BD
      territoryPrefix: 'TerritorioMC'    // Prefijo para las colecciones (ej. TerritorioMC 1)
      localities: [
        {
          key: 'micongregacion',
          name: 'Mi Congregación',
          territoryPrefix: 'TerritorioMC',
          storageKey: 'registerStatisticDataTerritorioMC',
          hasNumberedTerritories: true
        }
      ]
    };
    ```

3.  **Configuración de Mapas**:
    Crea un archivo `src/app/core/config/maps.micongregacion.ts` (copia de `maps.wheelwright.ts`) y define las URLs de los mapas para cada territorio.

    Modificar el archivo `src\app\modules\territory\territory-routing.module.ts` y agregar la nueva ruta

    ```json
      { path: 'nombre de la congre', component: MapasComponent},
    ```

### 2. Configuración de Angular (`angular.json`)

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
  // ... copia el resto de la config de wheelwright ...
}
```
Recuerda agregar también la configuración en `architect.serve.configurations`.

### 3. Inicialización de Base de Datos (Script)

Para poblar la base de datos con los territorios iniciales, usa el script incluido.

**Prerrequisitos:**
1.  Instalar dependencias del script:
    ```bash
    npm install firebase-admin inquirer
    ```
2.  **Service Account Key**:
    - Ve a la Consola de Firebase > Configuración del proyecto > Cuentas de servicio.
    - Genera una nueva clave privada.
    - Guarda el archivo JSON como `scripts/service-account.json`.

3. **Datos Manuales**:
    - Agregar la colección 'MapsTerritory' y un documento nuevo:
    ```json
    maps: [
      {
        link: "link",
        name: "name location",
        src: "https://i.postimg.cc/5XbRCwC8/mt.png"
      },
      {
        link: "link",
        name: "name location",
        src: "https://i.postimg.cc/KRXVZXcq/christ.png"
      },
      {
        link: "link",
        name: "name location",
        src: "https://i.postimg.cc/bsQ5r6sz/rural.png"
      }
    ]
    ```
    - Agregar la colección 'Statistics' y un documento nuevo:
    ```json
    territorio: [
      {
        link: "link",
        name: "name location",
        src: "../../../assets/img/group.png"
      },
      {
        link: "link",
        name: "name location",
        src: "../../../assets/img/group.png"
      },
      {
        link: "link",
        name: "name location",
        src: "../../../assets/img/group.png"
      }
    ]
    ```
    - Agregar la colección 'users' y un documento con tu nombre como id del documento:
    ```json
    password: "password",
    role: "admin"
    ```

**Ejecutar el Script:**
```bash
node scripts/init-congregation.js
```
Sigue las instrucciones en pantalla para definir el nombre de la congregación, cantidad de territorios y manzanas.

### 4. Ejecutar la Aplicación

Para probar la nueva congregación:
```bash
ng serve --configuration=micongregacion
```

## 📦 Despliegue

Cada congregación tiene su propio proyecto de Firebase y configuración. Para simplificar el proceso, se utiliza un script automatizado.

### Pasos para desplegar:

1. Ejecuta el script de despliegue:
   ```bash
   node scripts/deploy.js
   ```

2. **Selecciona la congregación**: El script te mostrará una lista de las congregaciones configuradas (basado en los archivos `src/environments/environment.*.ts`).

3. **Confirmación**: El script leerá automáticamente el `projectId` de firebase del archivo de entorno seleccionado y te pedirá confirmación antes de proceder.

4. **Proceso Automático**:
   - Compilará la aplicación usando la configuración de Angular correcta (`ng build --configuration=...`).
   - Desplegará los archivos al proyecto de Firebase correspondiente (`firebase deploy --project ...`).

> **Nota**: Asegúrate de estar logueado en firebase (`firebase login`) y tener permisos sobre los proyectos destino.
