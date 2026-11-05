import { Injectable, inject, signal, computed } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void> | void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({
  providedIn: 'root',
})
export class PwaService {
  private readonly _snackBar = inject(MatSnackBar);

  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private readonly _isIos = signal<boolean>(false);
  private readonly _btnPWA = signal<boolean>(true);

  // Expose as readonly computed properties
  isIos = computed(() => this._isIos());
  showInstallButton = computed(() => this._btnPWA());

  constructor() {
    this.initPWA();
  }

  private initPWA(): void {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    this._isIos.set(isIosDevice);

    // Detect if running in standalone mode (installed PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator &&
        Boolean((window.navigator as unknown as { standalone: boolean }).standalone));

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
      this.deferredPrompt = e as unknown as BeforeInstallPromptEvent;
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
