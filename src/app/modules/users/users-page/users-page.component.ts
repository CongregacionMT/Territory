import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { TerritoryDataService } from '../../../core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { DialogService } from '@core/services/dialog.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { User } from '@core/models/User';
import { tap } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-users-page',
  templateUrl: './users-page.component.html',
  styleUrls: ['./users-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
})
export class UsersPageComponent {
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private fb = inject(FormBuilder);
  private _snackBar = inject(MatSnackBar);
  private dialogService = inject(DialogService);

  showError = signal<boolean>(false);

  users = toSignal(
    this.territoryDataService.getUsers().pipe(tap(() => this.spinner.cerrarSpinner())),
    { initialValue: [] as User[] },
  );

  formUser: FormGroup;

  constructor() {
    this.spinner.cargarSpinner();
    this.formUser = this.fb.group({
      user: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required]),
      tokens: new FormControl([], [Validators.required]),
      rol: new FormControl('conductor'),
    });
  }

  async copyToClipboard(token: any): Promise<void> {
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

  alertSnack() {
    this._snackBar.open('📝 Token copiado al portapapeles!', 'ok', {
      duration: 3000,
    });
  }

  createUser() {
    if (this.formUser.controls?.['user'].invalid || this.formUser.controls?.['password'].invalid) {
      this.showError.set(true);
    } else {
      this.territoryDataService.postUser(this.formUser.value);
      this.formUser.reset({ rol: 'conductor', tokens: [] });
      this.showError.set(false);
      this._snackBar.open('👤 Usuario creado con éxito', 'ok', {
        duration: 3000,
      });
    }
  }

  deleteUser(idUser: string) {
    this.dialogService
      .openDialog(
        { title: 'Eliminar usuario', message: '¿Estás seguro de eliminar este usuario?' },
        ConfirmDialogComponent,
      )
      .subscribe((confirmed) => {
        if (confirmed) {
          this.territoryDataService.deleteUser(idUser);
        }
      });
  }
}
