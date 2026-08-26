import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, switchMap } from 'rxjs';
import { UpdateSnackbarComponent } from '@shared/components/update-snackbar/update-snackbar.component';

@Injectable({
  providedIn: 'root',
})
export class PwaService {
  private swUpdate = inject(SwUpdate);
  private _snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  private deferredPrompt: {
    prompt: () => void;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  } | null = null;
  private _isIos = signal<boolean>(false);
  private _btnPWA = signal<boolean>(true);

  // Expose as readonly computed properties
  isIos = computed(() => this._isIos());
  showInstallButton = computed(() => this._btnPWA());

  constructor() {
    this.initPWA();
    this.checkForUpdates();
  }

  private checkForUpdates(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        switchMap(() => {
          const snack = this._snackBar.openFromComponent(UpdateSnackbarComponent, {
            duration: undefined,
            horizontalPosition: 'center',
            verticalPosition: 'top',
          });
          return snack.onAction();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        void this.swUpdate.activateUpdate().then(() => window.location.reload());
      });

    void this.swUpdate.checkForUpdate();
  }

  private initPWA(): void {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    this._isIos.set(/iphone|ipad|ipod/.test(userAgent));

    // Check if standalone (installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      this._btnPWA.set(false);
    } else {
      this._btnPWA.set(true);
    }

    window.addEventListener('appinstalled', () => {
      this._btnPWA.set(false);
      this.deferredPrompt = null;
    });

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      this.deferredPrompt = e as any;
      this._btnPWA.set(true);
    });
  }

  installPWA(): void {
    if (this._isIos()) {
      this._snackBar.open(
        'Para instalar en iOS: Presiona "Compartir" y de las opciones elige "Agregar a Inicio" 📲',
        'Ok',
        {
          duration: 8000,
          verticalPosition: 'bottom',
          horizontalPosition: 'center',
        },
      );
      return;
    }

    if (!this.deferredPrompt) {
      this._snackBar.open(
        'Para instalar la app: busca la opción "Instalar aplicación" o "Añadir a pantalla de inicio" en el menú de tu navegador (⋮).',
        'Ok',
        {
          duration: 8000,
          verticalPosition: 'bottom',
          horizontalPosition: 'center',
        },
      );
      return;
    }

    void this.deferredPrompt.prompt();
    void this.deferredPrompt.userChoice.then(
      (choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
        if (choiceResult.outcome === 'accepted') {
          this._btnPWA.set(false);
        }
        this.deferredPrompt = null;
      },
    );
  }
}
