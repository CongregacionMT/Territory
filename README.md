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
    };
    ```

3.  **Configuración de Mapas**:
    Crea un archivo `src/app/core/config/maps.micongregacion.ts` (copia de `maps.wheelwright.ts`) y define las URLs de los mapas para cada territorio.

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

Para construir la versión de producción:
```bash
ng build --configuration=micongregacion
```
Los archivos se generarán en `dist/territory`.