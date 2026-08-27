import { Component, inject, signal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { filter } from 'rxjs';
import { DialogService } from '@core/services/dialog.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { User } from '@core/models/User';
import { UsersFeatureService } from '../services/users-feature.service';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-users-page',
  templateUrl: './users-page.component.html',
  styleUrls: ['./users-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule],
  providers: [UsersFeatureService, DialogService],
})
export class UsersPageComponent {
  featureService = inject(UsersFeatureService);
  private readonly _snackBar = inject(MatSnackBar);
  private readonly dialogService = inject(DialogService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  showError = signal<boolean>(false);

  formUser = this.fb.nonNullable.group({
    user: [
      '',
      [(control: AbstractControl): ValidationErrors | null => Validators.required(control)],
    ],
    password: [
      '',
      [(control: AbstractControl): ValidationErrors | null => Validators.required(control)],
    ],
    tokens: this.fb.nonNullable.control<string[]>([]),
    rol: this.fb.nonNullable.control<'admin' | 'conductor'>('conductor'),
  });

  async copyToClipboard(token: string | string[]): Promise<void> {
    const textToCopy = Array.isArray(token) ? token.join(', ') : String(token);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const dummyInput = document.createElement('input');
        document.body.appendChild(dummyInput);
        dummyInput.value = textToCopy;
        dummyInput.select();
        document.execCommand('copy');
        document.body.removeChild(dummyInput);
      }
      this.alertSnack();
    } catch {
      this.alertSnack();
    }
  }

  alertSnack(): void {
    this._snackBar.open('📝 Token copiado al portapapeles!', 'ok', {
      duration: 3000,
    });
  }

  async createUser(): Promise<void> {
    if (this.formUser.invalid) {
      this.showError.set(true);
      return;
    }
    this.showError.set(false);

    const rawVal = this.formUser.getRawValue();
    const userPayload: User = {
      user: rawVal.user,
      password: rawVal.password,
      rol: rawVal.rol,
      tokens: rawVal.tokens,
    };

    const success = await this.featureService.createUser(userPayload);
    if (success) {
      this.formUser.reset({ rol: 'conductor', tokens: [] });
      this._snackBar.open('👤 Usuario creado con éxito', 'ok', {
        duration: 3000,
      });
    } else {
      this._snackBar.open('❌ Error al crear usuario', 'ok', {
        duration: 3000,
      });
    }
  }

  deleteUser(userOrName: User | string): void {
    const userName = typeof userOrName === 'string' ? userOrName : userOrName.user;
    if (!userName) return;

    const dialogData = {
      title: 'Eliminar usuario',
      message: `¿Estás seguro de que deseas eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    };

    this.dialogService
      .openDialog(dialogData, ConfirmDialogComponent)
      .pipe(
        filter((confirmed): confirmed is boolean => confirmed === true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        void (async (): Promise<void> => {
          const success = await this.featureService.deleteUser(userName);
          if (success) {
            this._snackBar.open('🗑️ Usuario eliminado con éxito', 'ok', {
              duration: 3000,
            });
          } else {
            this._snackBar.open('❌ Error al eliminar usuario', 'ok', {
              duration: 3000,
            });
          }
        })();
      });
  }
}
