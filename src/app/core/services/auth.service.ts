import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Firestore, collection, query, where, collectionData } from '@angular/fire/firestore';
import { Observable, tap } from 'rxjs';
import { User } from '@core/models/User';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router = inject(Router);
  private firestore = inject(Firestore);

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
    void this.router.navigate(['auth']);
  }

  login(user: string, password: string): Observable<User[]> {
    const userRef = collection(this.firestore, 'users');
    const q = query(userRef, where('user', '==', user), where('password', '==', password));

    return (collectionData(q) as Observable<User[]>).pipe(
      tap((users: User[]) => {
        if (users.length !== 0) {
          const loggedUser = users[0];

          if (loggedUser.rol === 'admin') {
            localStorage.setItem(
              'tokenAdmin',
              'lkjkldjfaklsdfjklasjdfkljkfaklsdjadminaklsjdfklajsdlfkjaskdlfjaskldfjklasdfa',
            );
          } else {
            localStorage.setItem(
              'tokenConductor',
              'ei9qjwifojaiosdjfalksdfconductorlksjdfkljasldkfafklaksflk',
            );
          }

          localStorage.setItem(loggedUser.user, JSON.stringify(loggedUser));
          localStorage.setItem('nombreConductor', loggedUser.user);

          // Update auth state directly to avoid needing to reload or check again
          this.checkAuthStatus();
        }
      }),
    );
  }
}
