import {
  DestroyRef,
  Injectable,
  Signal,
  WritableSignal,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Departure, WeeklyDeparture } from '@core/models/Departures';
import { Group } from '@core/models/Group';
import { getWeekId } from '@shared/utils/date-utils';
import { sortDeparturesByDateTime } from '@shared/utils/departure-sort.utils';
import { TerritoryDataService } from './territory-data.service';

const WEEKLY_HISTORY_LIMIT = 20;
const MAX_CACHED_WEEKS = 8;

interface WeekEntry {
  readonly state: WritableSignal<Departure[] | undefined>;
  readonly subscription: Subscription;
}

/**
 * Firestore emits the cached snapshot first and then the server one, usually with
 * identical content. Treating equal payloads as "no change" keeps references stable,
 * so views are not re-rendered for nothing.
 */
function isSameData(previous: unknown, next: unknown): boolean {
  return previous === next || JSON.stringify(previous) === JSON.stringify(next);
}

/**
 * Session-long store for the data behind the departures screens.
 *
 * Listeners stay open while the app lives, so navigating away and back finds the data
 * already in memory instead of re-subscribing and flashing a loading skeleton.
 */
@Injectable({ providedIn: 'root' })
export class DeparturesStoreService {
  private readonly territoryData = inject(TerritoryDataService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly groupsState = signal<Group[] | undefined>(undefined, { equal: isSameData });
  private readonly historyState = signal<WeeklyDeparture[]>([], { equal: isSameData });
  private readonly weeks = new Map<string, WeekEntry>();
  private groupsConnected = false;
  private historyConnected = false;

  /** `undefined` until the first load; afterwards always the latest known groups. */
  readonly groups: Signal<Group[] | undefined> = this.groupsState.asReadonly();
  readonly weeklyHistory: Signal<WeeklyDeparture[]> = this.historyState.asReadonly();

  /** Starts (once) the listeners every departures screen needs. Safe to call repeatedly. */
  connect(): void {
    this.connectGroups();
    this.connectHistory();
    this.weekDepartures(getWeekId(new Date()));
  }

  /**
   * Departures of a week, sorted. `undefined` only while that week has never been loaded.
   * Safe to call from a `computed`: subscribing never writes to a signal synchronously
   * inside the reactive context.
   */
  weekDepartures(weekId: string): Signal<Departure[] | undefined> {
    const existing = this.weeks.get(weekId);
    if (existing) {
      // Re-insert to mark it as most recently used.
      this.weeks.delete(weekId);
      this.weeks.set(weekId, existing);
      return existing.state.asReadonly();
    }

    const state = signal<Departure[] | undefined>(undefined, { equal: isSameData });
    const subscription = untracked(() =>
      this.loadWeek(weekId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((departures) => state.set(departures)),
    );
    this.weeks.set(weekId, { state, subscription });
    this.evictLeastRecentlyUsedWeeks();
    return state.asReadonly();
  }

  private connectGroups(): void {
    if (this.groupsConnected) return;
    this.groupsConnected = true;
    this.territoryData
      .getGroupList()
      .pipe(
        catchError(() => of([] as Group[])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((groups) => this.groupsState.set(groups));
  }

  private connectHistory(): void {
    if (this.historyConnected) return;
    this.historyConnected = true;
    this.territoryData
      .getWeeklyDepartures(WEEKLY_HISTORY_LIMIT)
      .pipe(
        catchError(() => of([] as WeeklyDeparture[])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((history) => this.historyState.set(history));
  }

  private loadWeek(weekId: string): Observable<Departure[]> {
    return this.territoryData.getWeeklyDeparture(weekId).pipe(
      map((weekly) => sortDeparturesByDateTime(weekly?.departure ?? [])),
      catchError(() =>
        this.territoryData.getDepartures().pipe(
          map((master) => sortDeparturesByDateTime(master?.departure ?? [])),
          catchError(() => of([] as Departure[])),
        ),
      ),
    );
  }

  private evictLeastRecentlyUsedWeeks(): void {
    const currentWeekId = getWeekId(new Date());
    for (const [weekId, entry] of this.weeks) {
      if (this.weeks.size <= MAX_CACHED_WEEKS) return;
      if (weekId === currentWeekId) continue;
      entry.subscription.unsubscribe();
      this.weeks.delete(weekId);
    }
  }
}
