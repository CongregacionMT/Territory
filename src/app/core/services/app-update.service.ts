import { DOCUMENT, DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Observable, filter, fromEvent, interval, map, merge, startWith, throttleTime } from 'rxjs';
import { UpdateSnackbarComponent } from '@shared/components/update-snackbar/update-snackbar.component';

export const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
export const MIN_TIME_BETWEEN_CHECKS_MS = 60 * 1000;

/** Looks for new deployments and asks the user to update as soon as one is downloaded. */
@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  private isUpdateReady = false;
  private isPromptOpen = false;

  start(): void {
    if (!this.swUpdate.isEnabled) return;

    merge(
      this.swUpdate.versionUpdates.pipe(
        filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
      ),
      this.swUpdate.unrecoverable,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isUpdateReady = true;
        this.promptUpdate();
      });

    this.checkMoments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onCheckMoment());
  }

  /** On startup, on returning to the app, on reconnecting and periodically while visible. */
  private checkMoments(): Observable<void> {
    return merge(
      fromEvent(this.document, 'visibilitychange'),
      fromEvent(window, 'online'),
      interval(UPDATE_CHECK_INTERVAL_MS),
    ).pipe(
      map(() => undefined),
      startWith(undefined),
      filter(() => this.document.visibilityState === 'visible'),
      throttleTime(MIN_TIME_BETWEEN_CHECKS_MS),
    );
  }

  private onCheckMoment(): void {
    if (this.isUpdateReady) {
      this.promptUpdate();
      return;
    }

    this.swUpdate.checkForUpdate().catch((error: unknown) => {
      console.warn('[AppUpdateService] No se pudo buscar una actualización:', error);
    });
  }

  private promptUpdate(): void {
    if (this.isPromptOpen) return;
    this.isPromptOpen = true;

    const snackBarRef = this.snackBar.openFromComponent(UpdateSnackbarComponent, {
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });

    snackBarRef.onAction().subscribe(() => void this.applyUpdate());
    snackBarRef.afterDismissed().subscribe(() => {
      this.isPromptOpen = false;
    });
  }

  private async applyUpdate(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
    } catch (error: unknown) {
      console.warn('[AppUpdateService] No se pudo activar la actualización:', error);
    }
    this.document.location.reload();
  }
}
