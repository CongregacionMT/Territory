import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/** Gives the first screen time to render before warming up the most used routes. */
const PRELOAD_DELAY_MS = 1000;

/**
 * Preloads in the background only the lazy routes flagged with `data: { preload: true }`.
 * Heavy, rarely used modules (maps, statistics, ...) are left untouched.
 */
@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['preload'] !== true) return of(null);
    return timer(PRELOAD_DELAY_MS).pipe(mergeMap(() => load()));
  }
}
