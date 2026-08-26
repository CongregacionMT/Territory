import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogService } from '@core/services/dialog.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { UsersFeatureService } from '../services/users-feature.service';

@Component({
  selector: 'app-users-page',
  templateUrl: './users-page.component.html',
  styleUrls: ['./users-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  providers: [UsersFeatureService],
})
export class UsersPageComponent {
  featureService = inject(UsersFeatureService);
  private _snackBar = inject(MatSnackBar);
  private dialogService = inject(DialogService);
  private fb = inject(FormBuilder);

  showError = signal<boolean>(false);

  formUser = this.fb.nonNullable.group({
    user: ['', [Validators.required]],
    password: ['', [Validators.required]],
    tokens: this.fb.nonNullable.control<string[]>([]),
    rol: ['conductor'],
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

    // Get value typed as non-nullable
    const userPayload = this.formUser.getRawValue();

    const success = await this.featureService.createUser(userPayload as any);
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

  deleteUser(idUser: string): void {
    const dialogRef = this.dialogService.openDialog(
      { title: 'Eliminar usuario', message: '¿Estás seguro de eliminar este usuario?' },
      ConfirmDialogComponent,
    );
    dialogRef.subscribe((confirmed) => {
      if (confirmed) {
        void this.featureService.deleteUser(idUser).then((success) => {
          if (success) {
            this._snackBar.open('🗑️ Usuario eliminado', 'ok', { duration: 3000 });
          } else {
            this._snackBar.open('❌ Error al eliminar usuario', 'ok', { duration: 3000 });
          }
        });
      }
    });
  }
}
