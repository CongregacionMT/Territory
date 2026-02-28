# 🚀 Guía Rápida: Setup Automatizado de Congregación

## ¿Qué hace este script?

El script `setup-congregation.js` automatiza **TODO** el proceso de configuración de una nueva congregación:

### ✅ Archivos que crea/modifica automáticamente:

1. **`src/environments/environment.[congregacion].ts`**
   - Configuración de Firebase
   - Nombre y clave de la congregación
   - Configuración de localidades

2. **`src/app/core/config/maps.[congregacion].ts`**
   - Configuración de mapas para cada territorio
   - Mapas generales de localidades

3. **`angular.json`**
   - Agrega configuración de build
   - Agrega configuración de serve

4. **`src/app/modules/territory/territory-routing.module.ts`**
   - Agrega rutas para cada localidad

5. **Base de datos Firebase**
   - Crea colecciones de territorios con manzanas
   - Crea colección `MapsTerritory` (con links a localidades)
   - Crea colección `Statistics` (con links a localidades)
   - Crea colección `NumberTerritory` (índice de territorios)
   - Crea colección `Departures` (docDeparture y dateDeparture)
   - Crea colección `Cart` (docCart y locations)
   - Crea usuario admin

---

## 📋 Prerrequisitos

### 1. Dependencias NPM (ya instaladas ✓)
```bash
npm install firebase-admin inquirer
```

### 2. Service Account Key de Firebase

**¿Dónde obtenerlo?**
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Configuración del proyecto** (⚙️) > **Cuentas de servicio**
4. Click en **Generar nueva clave privada**
5. Guarda el archivo JSON descargado como:
   ```
   scripts/service-account.json
   ```

### 3. Configuración de Firebase

**¿Dónde obtenerla?**
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Configuración del proyecto** (⚙️) > **General**
4. En la sección **Tus aplicaciones**, busca **SDK de Firebase**
5. Copia los valores de:
   - `projectId`
   - `apiKey`
   - `authDomain`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
   - `measurementId` (opcional)

---

## 🎯 Cómo usar el script

### Paso 1: Ejecutar el script
```bash
node scripts/setup-congregation.js
```

### Paso 2: Seguir las instrucciones interactivas

El script te preguntará:

#### 📝 Información Básica
- **Nombre de la congregación**: Ej: "María Teresa"
- **Clave generada automáticamente**: Ej: "maria-teresa"
  - Puedes aceptarla o personalizarla

#### 📱 Configuración de Firebase
- Project ID
- API Key
- Auth Domain
- Storage Bucket
- Messaging Sender ID
- App ID
- Measurement ID (opcional)

#### 📍 Configuración de Localidades
Para cada localidad:
- **Nombre**: Ej: "María Teresa", "Christophersen"
- **Prefijo de territorio**: Ej: "TerritorioMT", "TerritorioC"
- **¿Tiene territorios numerados?**: Sí/No
- **Cantidad de territorios**: Ej: 15
- **Manzanas por cada territorio**: Te preguntará una por una (sin valor por defecto)

#### ✅ Confirmación
- Revisa el resumen
- Confirma para proceder

### Paso 3: Inicialización de Firebase
- El script te preguntará si quieres inicializar Firebase ahora
- Si tienes el `service-account.json`, di que sí
- Si no, puedes ejecutar `init-congregation.js` después

---

## 📊 Colecciones de Firebase Creadas

El script crea automáticamente todas las colecciones necesarias para que la aplicación funcione correctamente:

### 1. **Territorios** (Colecciones dinámicas)
- **Formato**: `{territoryPrefix}-{número}` (ej: `TerritorioMT-1`, `TerritorioMT-2`)
- **⚠️ IMPORTANTE**: Usa **guión** (`-`) no espacio (` `)
- **Propósito**: Almacenar la información de cada territorio
- **Contenido**: 
  - Manzanas (applesData)
  - Conductor asignado
  - Fechas de inicio/fin
  - Estado de completado
  - Comentarios

### 2. **MapsTerritory**
- **Documento**: `{congregationKey}`
- **Propósito**: Configurar los mapas disponibles por localidad
- **Estructura**:
  ```json
  {
    "maps": [
      {
        "link": "maria-teresa",  // ← Key de la localidad
        "name": "María Teresa",
        "src": "URL_de_imagen_miniatura"
      }
    ]
  }
  ```

### 3. **Statistics**
- **Documento**: `{congregationKey}`
- **Propósito**: Configurar las estadísticas por localidad
- **Estructura**:
  ```json
  {
    "territorio": [
      {
        "link": "maria-teresa",  // ← Key de la localidad
        "name": "María Teresa",
        "src": "../../../assets/img/group.png"
      }
    ]
  }
  ```

### 4. **NumberTerritory**
- **Documento**: `{congregationKey}`
- **Propósito**: Índice de territorios organizados por localidad
- **Estructura**:
  ```json
  {
    "maria-teresa": [
      { "territorio": "1", "collection": "TerritorioMT-1" },
      { "territorio": "2", "collection": "TerritorioMT-2" }
    ],
    "rural": [
      { "nombre": "", "distancia": "" }
    ]
  }
  ```

### 5. **Departures** (Salidas)
- **Documentos**: `docDeparture` y `dateDeparture`
- **Propósito**: Gestionar las salidas de predicación
- **docDeparture**:
  ```json
  {
    "departure": [
      {
        "driver": "",
        "location": "maria-teresa",
        "territory": [],
        "date": "2025-12-17",
        "maps": "",
        "point": "",
        "schedule": "09:30",
        "color": "success",
        "group": 0
      }
    ]
  }
  ```
- **dateDeparture**:
  ```json
  {
    "date": "2025-12-17"
  }
  ```

### 6. **Cart** (Carrito)
- **Documentos**: `docCart` y `locations`
- **Propósito**: Gestionar el carrito de salidas
- **docCart**:
  ```json
  {
    "cart": [
      {
        "assignment": "",
        "location": { "name": "", "linkMap": "" },
        "date": "Lunes",
        "schedule": "09:30",
        "color": "success"
      }
    ]
  }
  ```
- **locations**:
  ```json
  {
    "locations": [
      { "name": "", "linkMap": "" }
    ]
  }
  ```

### 7. **users**
- **Documento**: `admin`
- **Propósito**: Usuario administrador inicial
- **Contenido**:
  ```json
  {
    "user": "admin",
    "password": "admin2026",
    "rol": "admin"
  }
  ```

---

## 📝 Después de ejecutar el script

### 1. Actualizar iframes de mapas

Edita el archivo generado: `src/app/core/config/maps.[congregacion].ts`

Reemplaza los iframes vacíos con los de Google Maps:
```typescript
"TerritorioMT-1": '<iframe src="https://www.google.com/maps/d/embed?mid=..." width="640" height="480"></iframe>',
```

### 2. Actualizar imágenes en Firebase

Ve a Firebase Console y actualiza:

**Colección `MapsTerritory` > Documento `[congregacion]`:**
```json
{
  "maps": [
    {
      "link": "URL del mapa",
      "name": "Nombre de la localidad",
      "src": "URL de la imagen miniatura"
    }
  ]
}
```

**Colección `Statistics` > Documento `[congregacion]`:**
```json
{
  "territorio": [
    {
      "link": "URL de estadísticas",
      "name": "Nombre de la localidad",
      "src": "../../../assets/img/group.png"
    }
  ]
}
```

### 3. Actualizar ruta en: 

`territory-routing.module.ts`

```typescript
{ path: 'congregation', component: MapasComponent},
```

`assignment-record-routing.module.ts`

```typescript
{ path: 'congregation', component: TerritoryAssignmentComponent},
```

### 4. Probar la aplicación

```bash
npm run [localidad]
```

Ejemplo:
```bash
npm run maria-teresa
```

---

## 🔧 Solución de Problemas

### Error: "service-account.json no encontrado"
**Solución:** Descarga el Service Account Key desde Firebase Console y guárdalo en `scripts/service-account.json`

### Error al actualizar angular.json
**Solución:** Verifica que el archivo `angular.json` no esté abierto en otro editor y que tenga formato JSON válido

### Error al actualizar territory-routing.module.ts
**Solución:** El script mostrará las rutas que debes agregar manualmente si no puede hacerlo automáticamente

### Las rutas no funcionan
**Solución:** Verifica que las rutas en `territory-routing.module.ts` estén en kebab-case (ej: `maria-teresa`, no `mariaTeresa`)

---

## 📊 Ejemplo de Ejecución Completa

```
🚀 Configuración Automatizada de Nueva Congregación

Este script automatizará:
  ✓ Creación de archivos de entorno
  ✓ Creación de archivos de mapas
  ✓ Actualización de angular.json
  ✓ Actualización de territory-routing.module.ts
  ✓ Inicialización de base de datos Firebase

📝 PASO 1: Información Básica

? Nombre de la congregación: María Teresa
   Clave generada: maria-teresa
? ¿Usar esta clave? Yes

📱 PASO 2: Configuración de Firebase

? Project ID: territorios-maria-teresa
? API Key: AIza...
? Auth Domain: territorios-maria-teresa.firebaseapp.com
? Storage Bucket: territorios-maria-teresa.firebasestorage.app
? Messaging Sender ID: 123456789
? App ID: 1:123456789:web:abc123
? Measurement ID: G-ABC123

📍 PASO 3: Configuración de Localidades

? ¿Cuántas localidades tiene la congregación? 2

   Localidad 1/2:
? Nombre de la localidad: María Teresa
? Prefijo de territorio: TerritorioMT
? ¿Tiene territorios numerados? Yes
? ¿Cuántos territorios numerados? 15

  📋 Configurando manzanas para cada territorio:

  Territorio 1 - Número de manzanas: 4
  Territorio 2 - Número de manzanas: 5
  Territorio 3 - Número de manzanas: 4
  ...

   Localidad 2/2:
? Nombre de la localidad: Christophersen
? Prefijo de territorio: TerritorioC
? ¿Tiene territorios numerados? Yes
? ¿Cuántos territorios numerados? 8

  📋 Configurando manzanas para cada territorio:

  Territorio 1 - Número de manzanas: 3
  Territorio 2 - Número de manzanas: 4
  ...

📋 RESUMEN DE CONFIGURACIÓN:

   Congregación: María Teresa
   Clave: maria-teresa
   Firebase Project: territorios-maria-teresa
   Localidades: 2
     - María Teresa (TerritorioMT): 15 territorios
     - Christophersen (TerritorioC): 8 territorios

? ¿Proceder con la configuración? Yes

📁 PASO 5: Creando archivos...

   ✓ Creado: environment.maria-teresa.ts
   ✓ Creado: maps.maria-teresa.ts
   ✓ angular.json actualizado
   ✓ territory-routing.module.ts actualizado

🔥 PASO 6: Inicializando Firebase...

? ¿Inicializar base de datos Firebase ahora? Yes

📦 Inicializando base de datos Firebase...

   Procesando María Teresa...
      ✓ Creado: TerritorioMT 1
      ✓ Creado: TerritorioMT 2
      ...
   Procesando Christophersen...
      ✓ Creado: TerritorioC 1
      ...
   ✓ Colección MapsTerritory creada
   ✓ Colección Statistics creada
   ✓ Colección NumberTerritory creada
   ✓ Colección Departures (docDeparture) creada
   ✓ Colección Departures (dateDeparture) creada
   ✓ Colección Cart (docCart) creada
   ✓ Colección Cart (locations) creada
   ✓ Usuario admin creado/actualizado


✅ ¡CONFIGURACIÓN COMPLETADA!

📝 Archivos creados:
   - src/environments/environment.maria-teresa.ts
   - src/app/core/config/maps.maria-teresa.ts
   - angular.json (actualizado)
   - territory-routing.module.ts (actualizado)

🔥 Base de datos Firebase inicializada

🚀 Próximos pasos:
   1. Ejecutar: ng serve --configuration=maria-teresa
   2. Actualizar los iframes de mapas en:
      src/app/core/config/maps.maria-teresa.ts
   3. Configurar las imágenes en Firebase:
      - Colección MapsTerritory
      - Colección Statistics
```

---

## 🆚 Comparación: Antes vs Ahora

### ❌ Antes (Proceso Manual)
1. ⏱️ Duplicar y editar `environment.*.ts` manualmente
2. ⏱️ Duplicar y editar `maps.*.ts` manualmente
3. ⏱️ Editar `angular.json` manualmente (fácil cometer errores)
4. ⏱️ Editar `territory-routing.module.ts` manualmente
5. ⏱️ Ejecutar `init-congregation.js`
6. ⏱️ Crear manualmente colecciones en Firebase Console
7. ⏱️ Crear manualmente usuario admin

**Tiempo total: ~30-45 minutos**
**Riesgo de errores: Alto**
**Precisión: Depende de edición manual**

### ✅ Ahora (Proceso Automatizado)
1. 🚀 Ejecutar `node scripts/setup-congregation.js`
2. 🚀 Responder preguntas interactivas (con validación)
3. 🚀 El script configura cada territorio con su número exacto de manzanas
4. ✅ ¡Listo!

**Tiempo total: ~5-10 minutos**
**Riesgo de errores: Bajo**
**Precisión: 100% - cada territorio con sus manzanas exactas**

---

## 💡 Tips

- **Nombres de localidades**: Usa nombres descriptivos y claros
- **Prefijos de territorio**: Usa iniciales para mantenerlos cortos (ej: TerritorioMT, TerritorioC)
- **Claves**: Usa kebab-case (ej: maria-teresa, no mariaTeresa)
- **Backup**: Haz commit de tus cambios antes de ejecutar el script
- **Service Account**: Mantén el `service-account.json` seguro y NO lo subas a Git (ya está en .gitignore)

---

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los mensajes de error del script
2. Verifica que todos los prerrequisitos estén cumplidos
3. Revisa la sección de "Solución de Problemas"
4. Si el problema persiste, usa el método manual como fallback
