import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatSnackBarRef } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-update-snackbar',
  imports: [MatIconModule],
  templateUrl: './update-snackbar.component.html',
  styleUrl: './update-snackbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpdateSnackbarComponent {
  private snackRef = inject(MatSnackBarRef<UpdateSnackbarComponent>);

  actualizarAhora() {
    this.snackRef.dismissWithAction();
  }

  cerrar() {
    this.snackRef.dismiss();
  }
}
