import { ComponentType } from '@angular/cdk/portal';
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

@Injectable()
export class DialogService {
  private readonly matDialog = inject(MatDialog);

  openDialog<T, D = unknown, R = boolean>(
    data: D,
    component: ComponentType<T>,
  ): Observable<R | undefined> {
    return this.matDialog
      .open(component, {
        data: data,
        disableClose: true,
      })
      .afterClosed() as Observable<R | undefined>;
  }

  confirmDialog(message: string, isAcepted: boolean = true): Observable<boolean | undefined> {
    const dialogRef = this.matDialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { message, isAcepted },
    });
    return dialogRef.afterClosed() as Observable<boolean | undefined>;
  }
}
