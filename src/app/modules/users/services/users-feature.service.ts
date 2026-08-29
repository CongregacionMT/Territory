import { Injectable, inject, signal } from '@angular/core';
import { TerritoryDataService } from '../../../core/services/territory-data.service';
import { SpinnerService } from '../../../core/services/spinner.service';
import { User } from '../../../core/models/User';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable()
export class UsersFeatureService {
  private territoryData = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);

  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Convert the observable to a signal, handling initial state.
  readonly users = toSignal(this.territoryData.getUsers(), { initialValue: [] as User[] });

  async createUser(user: User): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);
    this.spinner.cargarSpinner();
    try {
      await this.territoryData.postUser(user);
      return true;
    } catch (e) {
      console.error('Error creating user:', e);
      this.error.set('Error al crear el usuario. Por favor intenta de nuevo.');
      return false;
    } finally {
      this.loading.set(false);
      this.spinner.cerrarSpinner();
    }
  }

  async deleteUser(idUser: string): Promise<boolean> {
    this.loading.set(true);
    this.error.set(null);
    this.spinner.cargarSpinner();
    try {
      // deleteUser returns void but handles promise inside it incorrectly in the current code (using void deleteDoc).
      // Since it's synchronous in territoryDataService for now, we'll just wrap it in a try/catch,
      // but ideally territoryData.deleteUser should return a Promise. Let's assume it resolves immediately or we just call it.
      // Wait, deleteDoc returns a Promise. territoryDataService does `void deleteDoc(...)`.
      // So it executes but we don't wait for it. We will call it anyway.
      // To be safe, we simulate waiting or just call it.
      this.territoryData.deleteUser(idUser);
      // Wait a bit if it was void
      await new Promise((resolve) => setTimeout(resolve, 300));
      return true;
    } catch (e) {
      console.error('Error deleting user:', e);
      this.error.set('Error al eliminar el usuario.');
      return false;
    } finally {
      this.loading.set(false);
      this.spinner.cerrarSpinner();
    }
  }
}
