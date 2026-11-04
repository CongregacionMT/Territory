import { environment } from '@environments/environment';
import { TerritorioStats } from '@core/models/TerritorioStats';

export interface CampaignLocalityGroup {
  name: string;
  territories: TerritorioStats[];
  completed: number;
  total: number;
  percent: number;
  applesDone: number;
  applesTotal: number;
}

export interface WeeklyDeparture {
  weekId: string;
  departure: DailyDeparture[];
}

export interface DailyDeparture {
  date: string;
  driver?: string;
  location?: string;
  point?: string;
}

export interface DepartureInfo {
  id: string;
  date: string;
  dateLabel: string;
  driver: string;
  locality: string | null;
  point: string;
  checked: boolean;
  publishers?: number;
}

/** Extrae solo el número del final de un texto (ej: "MT-5" -> "5"). */
function extractTrailingNumber(text: string): string | null {
  let index = text.length;
  while (index > 0 && /\d/.test(text.charAt(index - 1))) {
    index--;
  }
  return index < text.length ? text.slice(index) : null;
}

export function formatTerritoryName(key: string): string {
  if (!key) return 'Territorio';
  if (key.startsWith('Territorio ')) return key;

  // Si es un nombre de colección (ej: SanRafael-Territorio-5 o TerritorioMT-5), lo limpiamos
  if (key.includes('Territorio')) {
    const parts = key.split(/[- ]/);
    // El número suele ser la última parte (ej: "5" en "TerritorioMT-5" o "MT-5")
    const trailingNumber = extractTrailingNumber(parts[parts.length - 1]);

    if (trailingNumber) {
      return `Territorio ${trailingNumber}`;
    }
  }

  return key;
}

export type FirebaseDate = string | number | Date | { toDate?: () => Date; seconds?: number };

export function parseFirebaseDate(date?: FirebaseDate | null): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date === 'object') {
    if ('toDate' in date && typeof date.toDate === 'function') {
      return date.toDate();
    }
    if ('seconds' in date && typeof date.seconds === 'number') {
      return new Date(date.seconds * 1000);
    }
  }
  return new Date(date as string | number);
}

export function groupStatsByLocality(
  stats: Record<string, { percent?: number; total?: number; salidas?: number; done?: number }>,
): CampaignLocalityGroup[] {
  if (!stats) return [];

  const groupsMap = new Map<string, CampaignLocalityGroup>();

  // Ordenar localidades por longitud de prefijo descendente para evitar falsos positivos
  // Ejemplo: 'TerritorioCAI' debe evaluarse antes que 'TerritorioC'
  const sortedLocalities = [...(environment.localities || [])].sort(
    (a, b) => b.territoryPrefix.length - a.territoryPrefix.length,
  );

  // Inicializar grupos base según environment
  if (sortedLocalities.length > 0) {
    sortedLocalities.forEach((loc) => {
      groupsMap.set(loc.territoryPrefix, {
        name: loc.name,
        territories: [],
        completed: 0,
        total: 0,
        percent: 0,
        applesDone: 0,
        applesTotal: 0,
      });
    });
  } else {
    groupsMap.set(environment.territoryPrefix, {
      name: environment.congregationName,
      territories: [],
      completed: 0,
      total: 0,
      percent: 0,
      applesDone: 0,
      applesTotal: 0,
    });
  }

  // Carpeta "Otros" por si hay keys que no hagan match
  groupsMap.set('OTROS', {
    name: 'Otros Territorios',
    territories: [],
    completed: 0,
    total: 0,
    percent: 0,
    applesDone: 0,
    applesTotal: 0,
  });

  Object.keys(stats).forEach((key) => {
    // Ignorar stats globales o con errores de undefined
    if (key === 'global' || key.includes('undefined')) return;

    let matchedPrefix = 'OTROS';

    // Buscar si el key empieza con algún prefijo conocido
    if (sortedLocalities.length > 0) {
      const match = sortedLocalities.find((loc) => key.startsWith(loc.territoryPrefix));
      if (match) {
        matchedPrefix = match.territoryPrefix;
      }
    } else {
      if (key.startsWith(environment.territoryPrefix)) {
        matchedPrefix = environment.territoryPrefix;
      }
    }

    const rawTerritory = stats[key];
    const group = groupsMap.get(matchedPrefix);
    if (group) {
      const territorio: TerritorioStats = {
        id: key,
        nombre: formatTerritoryName(key),
        porcentaje: rawTerritory.percent || 0,
        total: rawTerritory.total || 0,
        salidas: rawTerritory.salidas || 0,
      };

      group.territories.push(territorio);
      group.applesDone += rawTerritory.done || 0;
      group.applesTotal += rawTerritory.total || 0;
    }
  });

  // Convertir a array, calcular totales, ordenar territorios por número internamente y filtrar grupos vacíos
  return Array.from(groupsMap.values())
    .filter((group) => group.territories.length > 0)
    .map((group) => {
      group.territories.sort((a, b) => {
        const numA = parseInt(a.nombre.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.nombre.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      group.completed = group.territories.filter((t) => t.porcentaje === 100).length;
      group.total = group.territories.length;
      group.percent =
        group.applesTotal > 0 ? Math.round((group.applesDone / group.applesTotal) * 100) : 0;

      return group;
    });
}

function parseCampaignDate(value: FirebaseDate): Date | null {
  if (typeof value === 'string') {
    return new Date(value.includes('T') ? value : value + 'T12:00:00');
  }
  if (typeof value === 'number') return new Date(value);
  if (value instanceof Date) return value;
  if (value && typeof value === 'object') {
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  }
  return null;
}

export function filterDeparturesByCampaignDates(
  departures: WeeklyDeparture[],
  dateInit: FirebaseDate,
  dateEnd: FirebaseDate | null | undefined,
): DepartureInfo[] {
  if (!departures || !departures.length) return [];

  // Extraer fecha de inicio de forma robusta
  const initTime = parseCampaignDate(dateInit)?.getTime() ?? 0;

  // Calcular fecha fin (límite superior)
  let endTime = Infinity;
  if (dateEnd) {
    const endDate = parseCampaignDate(dateEnd) ?? new Date();
    // Forzamos al último milisegundo del día en hora LOCAL
    endDate.setHours(23, 59, 59, 999);
    endTime = endDate.getTime();
  }

  // Ajustar initTime al lunes de esa semana para no perder la semana de inicio
  const startDate = new Date(initTime);
  const day = startDate.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const mondayOfStartWeek = new Date(startDate);
  mondayOfStartWeek.setDate(startDate.getDate() - diffToMonday);
  mondayOfStartWeek.setHours(12, 0, 0, 0);
  const startCompareTime = mondayOfStartWeek.getTime();

  const inRangeWeeks = departures.filter((d) => {
    const dDate = new Date(d.weekId + 'T12:00:00').getTime();
    return dDate >= startCompareTime;
  });

  const allIndividualDepartures: DepartureInfo[] = [];
  inRangeWeeks.forEach((week) => {
    if (week.departure && Array.isArray(week.departure)) {
      week.departure.forEach((dep: DailyDeparture, idx: number) => {
        const depDate = new Date(dep.date + 'T12:00:00').getTime();
        const isAfterInit = depDate >= initTime;
        const isBeforeEnd = depDate <= endTime;

        if (isAfterInit && isBeforeEnd) {
          let localityName: string | undefined;
          if (dep.location && environment.localities?.length) {
            const depLoc = dep.location;
            const sortedLoc = [...environment.localities].sort(
              (a, b) => b.territoryPrefix.length - a.territoryPrefix.length,
            );
            const match = sortedLoc.find((loc) => depLoc.startsWith(loc.territoryPrefix));
            localityName = match?.name;
          }

          const parsedDate = new Date(dep.date + 'T12:00:00');
          const dateLabel = parsedDate.toLocaleDateString('es-AR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          });

          allIndividualDepartures.push({
            id: `${week.weekId}-${idx}`,
            date: dep.date,
            dateLabel,
            driver: dep.driver || 'Sin conductor',
            locality: localityName || null,
            point: dep.point || 'Sin punto de encuentro',
            checked: false,
          });
        }
      });
    }
  });

  allIndividualDepartures.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return allIndividualDepartures;
}

export function removeUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date || typeof (obj as { toDate?: unknown }).toDate === 'function') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return (obj as unknown[])
      .filter((item: unknown) => item !== undefined)
      .map((item: unknown) => removeUndefined(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  const objRecord = obj as Record<string, unknown>;
  for (const k of Object.keys(objRecord)) {
    const val = objRecord[k];
    if (val !== undefined) {
      result[k] = removeUndefined(val);
    }
  }
  return result as T;
}
