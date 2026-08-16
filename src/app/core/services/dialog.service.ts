import { ComponentType } from '@angular/cdk/portal';
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private matDialog = inject(MatDialog);

  openDialog<T, D = any, R = boolean>(
    data: D,
    component: ComponentType<T>,
  ): Observable<R | undefined> {
    return this.matDialog
      .open(component, {
        data: data,
        disableClose: true,
      })
      .afterClosed();
  }
}
