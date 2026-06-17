# Implementación: Mapa con Brújula (Google Maps JS API + KML)

## Resumen

Migrar el mapa embebido de Google My Maps (iframe) a **Google Maps JavaScript API** cargando **KML** como capa, con soporte de **rotación manual** y **modo brújula** (orientación del dispositivo). Si el KML falla (cuota, permiso, red), hace **fallback automático** al iframe original.

---

## Requisitos Previos

- Google Maps API Key → ya en `environment.*.ts` → `googleMapsApiKey`
- Map ID (vector, para habilitar heading/tilt) → ya en `environment.*.ts` → `mapId`
- KMLs exportados de Google My Maps → en `src/assets/maps/{congregationKey}/`

---

## Archivos Ya Creados (✅ Listos)

### 1. `angular.json` — assets
Agregar `"src/assets/maps"` a la lista de assets (línea 38):

```json
"assets": [
  "src/favicon.ico",
  "src/assets",
  "src/assets/maps",
  "src/manifest.webmanifest",
  "src/firebase-messaging-sw.js"
]
```

### 2. `src/app/core/config/maps.types.ts`
Interface extendida con formato híbrido (KML + fallback iframe):

```typescript
export interface MapConfig {
  maps: Record<string, {
    kmlUrl?: string;
    iframeHtml?: string;
    center?: { lat: number; lng: number };
    zoom?: number;
  }>;
}
export const MAP_CONFIG = new InjectionToken<MapConfig>('MAP_CONFIG');
```

### 3. `src/app/core/config/maps.wheelwright.ts`
Formato híbrido: territorios con KML + generales con iframe:

```typescript
export const mapConfig: MapConfig = {
  maps: {
    "TerritorioW-1": { kmlUrl: 'assets/maps/wheelwright/TerritorioW-1.kml' },
    "TerritorioW-2": { kmlUrl: 'assets/maps/wheelwright/TerritorioW-2.kml' },
    "TerritorioW-3": { kmlUrl: 'assets/maps/wheelwright/TerritorioW-3.kml' },
    // ... resto de territorios

    // Mapas generales → iframe (sin KML)
    "wheelwright": { iframeHtml: '<iframe src="https://www.google.com/maps/d/embed?mid=1JWlK-RxKm2QcIJAIQdboy2kXAL5yM3U&ehbc=2E312F" width="100%" height="100%" style="border: 0" loading="lazy" allowfullscreen></iframe>' },
    "rural": { iframeHtml: '<iframe src="..."...' },
    "ubications-overseer": { iframeHtml: '<iframe src="..."...' }
  }
};
```

### 4. `src/app/modules/territory/services/territory-map.service.ts`
Servicio core: carga API, initMap, KML layer, brújula, fallback.

**API pública del servicio:**

| Método | Descripción |
|--------|-------------|
| `loadMapsApi()` | Carga Google Maps JS API dinámicamente (script tag) |
| `initMap(element)` | Crea `google.maps.Map` con mapId, heading, tilt |
| `loadKml(map, kmlUrl)` | Agrega `KmlLayer` con timeout 10s + status check |
| `setHeading(deg)` | Rotación programática del mapa |
| `setTilt(deg)` | Inclinación 3D |
| `setCenter(lat, lng)` | Centrar mapa |
| `getHeading()` | Obtener heading actual |
| `enableCompassMode()` | Activa listener `deviceorientation` (iOS: pide permiso) |
| `disableCompassMode()` | Desactiva listener |
| `createFallbackIframe(container, html)` | Inyecta iframe original como fallback |
| `destroy()` | Cleanup completo (KML, listeners) |

### 5. `src/app/modules/territory/components/territory-map/territory-map.component.ts`
Componente standalone con signals.

**Inputs:**
- `collection: string` — ej: "TerritorioW-1"
- `congregationKey: string` — ej: "wheelwright"

**Signals:**
- `compassMode`, `heading`, `mapLoaded`, `useFallback`, `error`

**Métodos públicos:**
- `toggleCompass()` — Activa/desactiva modo brújula
- `rotate(degrees)` — Rota mapa ±90° manualmente
- `getHeadingLabel()` — Devuelve N/NE/E/SE/S/SO/O/NO
- `retry()` — Reintenta carga si hubo error

---

## Archivos Pendientes (❌ Por Crear/Modificar)

### 6. `src/app/modules/territory/components/territory-map/territory-map.component.html`

```html
<div #mapContainer class="map-container"
     [class.loaded]="mapLoaded()"
     [class.fallback]="useFallback()"
     [class.error]="error()">

  @if (error() && !useFallback()) {
    <div class="map-error-overlay">
      <p>{{ error() }}</p>
      <button class="btn btn-primary" (click)="retry()">Reintentar</button>
    </div>
  }
</div>

@if (mapLoaded() && !useFallback()) {
  <div class="map-controls">
    <button class="compass-btn"
            (click)="toggleCompass()"
            [class.active]="compassMode()"
            title="Modo brújula">
      🧭
    </button>

    <div class="rotation-controls">
      <button class="btn-rotate" (click)="rotate(-90)" title="Rotar izquierda">↺</button>
      <button class="btn-rotate" (click)="rotate(90)" title="Rotar derecha">↻</button>
    </div>

    <div class="heading-display">{{ getHeadingLabel() }}</div>

    <div class="degrees-display">{{ heading() }}°</div>
  </div>
}

@if (mapLoaded() && useFallback()) {
  <!-- Si es fallback, se muestra el iframe dentro de mapContainer -->
}
```

### 7. `src/app/modules/territory/components/territory-map/territory-map.component.scss`

```scss
.map-container {
  width: 100%;
  height: 480px;
  min-height: 480px;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: #e8e8e8;

  &.loaded {
    background: transparent;
  }

  &.error {
    background: #fff;
  }

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
  }
}

.map-controls {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;

  .compass-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 2px solid #ccc;
    background: white;
    font-size: 1.3rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    transition: all 0.2s;

    &.active {
      background: #0d6efd;
      color: white;
      border-color: #0d6efd;
    }
  }

  .rotation-controls {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;

    .btn-rotate {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid #ccc;
      background: white;
      font-size: 1.1rem;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }
  }

  .heading-display {
    background: rgba(255,255,255,0.9);
    padding: 0.25rem 0.6rem;
    border-radius: 6px;
    font-weight: bold;
    font-size: 0.9rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }

  .degrees-display {
    background: rgba(0,0,0,0.6);
    color: white;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-family: monospace;
  }
}

.map-error-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.95);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  z-index: 10;
  padding: 2rem;
  text-align: center;
}

@media (max-width: 576px) {
  .map-container {
    height: 350px;
    min-height: 350px;
  }

  .map-controls {
    top: 0.5rem;
    right: 0.5rem;

    .compass-btn {
      width: 38px;
      height: 38px;
      font-size: 1.1rem;
    }

    .btn-rotate {
      width: 32px;
      height: 32px;
      font-size: 0.9rem;
    }
  }
}
```

### 8. `src/app/modules/territory/pages/card-territory/card-territory.component.ts`

**Cambios necesarios:**

1. Eliminar imports:
   - `DomSanitizer, SafeHtml` de `@angular/platform-browser`
   - `mapConfig` de `@core/config/maps.config`

2. Eliminar señal/inyección:
   - `iframe = signal<SafeHtml | null>(null)`
   - `private domSanitizer = inject(DomSanitizer)`

3. Agregar import:
   - `TerritoryMapComponent` desde `'../../components/territory-map/territory-map.component'`

4. Agregar señal computada:
   - `congregationKey = environment.congregationKey`

5. Modificar `ngOnInit()`:
   ```typescript
   // Eliminar:
   // const mapHtml = mapConfig.maps[collection];
   // if (mapHtml) { this.iframe.set(this.domSanitizer.bypassSecurityTrustHtml(mapHtml)); }
   
   // path() ya se setea en constructor, está listo para pasar al componente
   ```

6. Agregar `TerritoryMapComponent` al array `imports` del @Component:
   ```typescript
   imports: [
     BreadcrumbComponent,
     ReactiveFormsModule,
     FocusInvalidInputDirective,
     RouterLink,
     ModalComponent_1,
     TitleCasePipe,
     TerritoryMapComponent,  // ← NUEVO
   ],
   ```

### 9. `src/app/modules/territory/pages/card-territory/card-territory.component.html`

Reemplazar línea 21:

```html
<!-- ANTES -->
<div class="d-flex justify-content-center" [innerHTML]="iframe()"></div>

<!-- DESPUÉS -->
<div class="w-100">
  <app-territory-map
    [collection]="path()"
    [congregationKey]="congregationKey">
  </app-territory-map>
</div>
```

---

## ⚠️ Problema Técnico a Resolver: Inyección de MAP_CONFIG

El `TerritoryMapComponent` usa `inject(MAP_CONFIG)` pero **`MAP_CONFIG` nunca se provee** en la app. El original importa `mapConfig` directamente.

**Solución recomendada:** Cambiar el componente para importar `mapConfig` directamente (consistente con el código existente), ya que Angular hace file replacement del config según la congregación.

**En `territory-map.component.ts`, reemplazar:**

```typescript
// ELIMINAR:
import { MAP_CONFIG } from '@core/config/maps.types';
import { MapConfig } from '@core/config/maps.types';
// ...
private mapConfig = inject<Record<string, MapConfig>>(MAP_CONFIG);

// AGREGAR:
import { mapConfig } from '@core/config/maps.config';
// ...
private mapConfig = mapConfig;
```

Y cambiar `currentMapConfig()`:
```typescript
currentMapConfig = computed(() => {
  return this.mapConfig?.maps?.[this.collection()];
});
```

---

## Estructura de KMLs

```
src/assets/maps/
├── wheelwright/
│   ├── TerritorioW-1.kml
│   ├── TerritorioW-2.kml
│   ├── TerritorioW-3.kml
│   └── ... (hasta TerritorioW-23)
├── maria-teresa/
│   └── ... (cuando se agreguen)
├── hughes/
│   └── ... (cuando se agreguen)
└── arias/
    └── ... (cuando se agreguen)
```

---

## Variables de Entorno Necesarias

En cada `environment.{congregation}.ts`:

```typescript
googleMapsApiKey: 'AIzaSy...',
mapId: '5d8d6c22a66f94b7804fb3a7',  // Map ID vector (heading/tilt)
```

---

## Flujo de Funcionamiento

```
1. Usuario navega a /TerritorioW-1
2. CardTerritoryComponent.ngOnInit()
   → path() = "TerritorioW-1"
3. <app-territory-map [collection]="'TerritorioW-1'">
4. TerritoryMapComponent.ngOnInit()
   → busca config en mapConfig.maps['TerritorioW-1']
5. ¿Tiene kmlUrl?
   → SÍ: carga Google Maps API + KML → mapa interactivo con brújula
   → NO: ¿tiene iframeHtml? → fallback a iframe original
```

---

## Testing Checklist

- [ ] `npm run wheelwright` compila sin errores
- [ ] Navegar a `/TerritorioW-1` → mapa KML carga
- [ ] Brújula: botón activa orientación del dispositivo (mobile)
- [ ] Rotación manual: botones ±90° funcionan
- [ ] Heading label: N/NE/E/SE/S/SO/O/NO según rotación
- [ ] Fallback: renombrar KML temporalmente → iframe original carga
- [ ] Mapas generales (`wheelwright`, `rural`) → iframe directo
- [ ] Responsive: mobile < 576px, tablet, desktop
- [ ] Cleanup: salir de página → sin memory leaks

---

## Orden de Implementación Recomendado

| Orden | Archivo | Depende de |
|-------|---------|------------|
| 1 | `maps.config.ts` (otros congregations) | N/A (paralelo) |
| 2 | `territory-map.component.html` | Service listo |
| 3 | `territory-map.component.scss` | N/A |
| 4 | Fix `territory-map.component.ts` (MAP_CONFIG → import directo) | Service + types |
| 5 | `card-territory.component.ts` | Component listo |
| 6 | `card-territory.component.html` | Component listo |
| 7 | Test | Todo lo anterior |

---

## Notas Técnicas

- **KmlLayer** preserva estilos colores del My Maps original
- **preserveViewport: true** — respeta centro/zoom del KML
- **DeviceOrientationEvent** — iOS 13+ requiere `requestPermission()` en respuesta a gesto del usuario
- **Timeout KML 10s** — evita que el mapa se quede cargando indefinidamente
- **Fallback automático** — si KML o API falla, muestra iframe original
