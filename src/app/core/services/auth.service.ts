import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router = inject(Router);

  // Private signals for state
  private _isAdmin = signal<boolean>(false);
  private _isDriver = signal<boolean>(false);
  private _driverName = signal<string>('');

  // Public computed signals
  isAdmin = computed(() => this._isAdmin());
  isDriver = computed(() => this._isDriver());
  driverName = computed(() => this._driverName());

  // Login button logic based on exact same rules
  showLoginButton = computed(() => !(this._isAdmin() || this._isDriver()));

  constructor() {
    this.checkAuthStatus();
  }

  checkAuthStatus(): void {
    const adminToken = localStorage.getItem('tokenAdmin');
    const driverToken = localStorage.getItem('tokenConductor');
    const driverName = localStorage.getItem('nombreConductor');

    if (adminToken) {
      this._isAdmin.set(true);
      this._isDriver.set(false);
    } else if (driverToken) {
      this._isAdmin.set(false);
      this._isDriver.set(true);
    } else {
      this._isAdmin.set(false);
      this._isDriver.set(false);
    }

    if (driverName) {
      this._driverName.set(driverName);
    }
  }

  logout(): void {
    localStorage.clear();
    this._isAdmin.set(false);
    this._isDriver.set(false);
    this._driverName.set('');
    this.router.navigate(['auth']);
  }
}
