import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppUpdateService,
  MIN_TIME_BETWEEN_CHECKS_MS,
  UPDATE_CHECK_INTERVAL_MS,
} from './app-update.service';

describe('AppUpdateService', () => {
  let service: AppUpdateService;
  let versionUpdates: Subject<{ type: string }>;
  let unrecoverable: Subject<unknown>;
  let dismissed: Subject<void>;
  let action: Subject<void>;
  let swUpdate: {
    isEnabled: boolean;
    versionUpdates: Subject<{ type: string }>;
    unrecoverable: Subject<unknown>;
    checkForUpdate: ReturnType<typeof vi.fn>;
    activateUpdate: ReturnType<typeof vi.fn>;
  };
  let snackBar: { openFromComponent: ReturnType<typeof vi.fn> };
  let reload: ReturnType<typeof vi.fn>;
  let fakeDocument: EventTarget & { visibilityState: string; location: { reload: () => void } };

  const configure = (isEnabled = true): void => {
    swUpdate.isEnabled = isEnabled;
    TestBed.configureTestingModule({
      providers: [
        AppUpdateService,
        { provide: SwUpdate, useValue: swUpdate },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: DOCUMENT, useValue: fakeDocument },
      ],
    });
    service = TestBed.inject(AppUpdateService);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    versionUpdates = new Subject();
    unrecoverable = new Subject();
    dismissed = new Subject();
    action = new Subject();
    reload = vi.fn();
    swUpdate = {
      isEnabled: true,
      versionUpdates,
      unrecoverable,
      checkForUpdate: vi.fn().mockResolvedValue(false),
      activateUpdate: vi.fn().mockResolvedValue(true),
    };
    snackBar = {
      openFromComponent: vi.fn(() => ({
        onAction: () => action,
        afterDismissed: () => dismissed,
      })),
    };
    fakeDocument = Object.assign(new EventTarget(), {
      visibilityState: 'visible',
      location: { reload },
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('does nothing when the service worker is disabled', () => {
    configure(false);
    service.start();

    expect(swUpdate.checkForUpdate).not.toHaveBeenCalled();
  });

  it('checks on startup and periodically', () => {
    configure();
    service.start();
    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('checks when the user returns to the app', () => {
    configure();
    service.start();
    vi.advanceTimersByTime(MIN_TIME_BETWEEN_CHECKS_MS);

    fakeDocument.dispatchEvent(new Event('visibilitychange'));

    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('does not check while the app is in the background', () => {
    configure();
    service.start();
    fakeDocument.visibilityState = 'hidden';

    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);

    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it('prompts once when a new version is ready', () => {
    configure();
    service.start();

    versionUpdates.next({ type: 'VERSION_DETECTED' });
    expect(snackBar.openFromComponent).not.toHaveBeenCalled();

    versionUpdates.next({ type: 'VERSION_READY' });
    versionUpdates.next({ type: 'VERSION_READY' });
    expect(snackBar.openFromComponent).toHaveBeenCalledTimes(1);
  });

  it('prompts again at the next check after the user dismisses it', () => {
    configure();
    service.start();
    versionUpdates.next({ type: 'VERSION_READY' });

    dismissed.next();
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);

    expect(snackBar.openFromComponent).toHaveBeenCalledTimes(2);
  });

  it('prompts when the running version can no longer be recovered', () => {
    configure();
    service.start();

    unrecoverable.next({ type: 'UNRECOVERABLE_STATE' });

    expect(snackBar.openFromComponent).toHaveBeenCalledTimes(1);
  });

  it('activates the new version and reloads when the user accepts', async () => {
    configure();
    service.start();
    versionUpdates.next({ type: 'VERSION_READY' });

    action.next();
    await vi.advanceTimersByTimeAsync(0);

    expect(swUpdate.activateUpdate).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
  });

  it('reloads even if the activation fails', async () => {
    swUpdate.activateUpdate.mockRejectedValue(new Error('activation failed'));
    configure();
    service.start();
    versionUpdates.next({ type: 'VERSION_READY' });

    action.next();
    await vi.advanceTimersByTimeAsync(0);

    expect(reload).toHaveBeenCalled();
  });

  it('survives a failed check', async () => {
    swUpdate.checkForUpdate.mockRejectedValue(new Error('offline'));
    configure();

    expect(() => service.start()).not.toThrow();
    await vi.advanceTimersByTimeAsync(0);
  });
});
