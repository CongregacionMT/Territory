import { Component, inject, viewChild } from '@angular/core';
import { TerritoryDataService } from '../../../core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { needConfirmation } from '@shared/decorators/confirm-dialog.decorator';

import { User } from '@core/models/User';

@Component({
    selector: 'app-users-page',
    templateUrl: './users-page.component.html',
    styleUrls: ['./users-page.component.scss'],
    imports: [ReactiveFormsModule]
})

export class UsersPageComponent {
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private fb = inject(FormBuilder);
  private _snackBar = inject(MatSnackBar);


  readonly errorMessage = viewChild<any>('errorMessage');

  users: User[] = [];

  formUser: FormGroup;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor(){
    this.spinner.cargarSpinner();
    this.formUser = this.fb.group({
      user: new FormControl(null, [Validators.required]),
      password: new FormControl(null, [Validators.required]),
      tokens: new FormControl([], [Validators.required]),
      rol: new FormControl('conductor')
    });
    this.territoryDataService.getUsers().subscribe(users => {
      this.spinner.cerrarSpinner();
      this.users = users
    });
  }
  copyToClipboard(token: any): void {
    const dummyInput = document.createElement('input');
    document.body.appendChild(dummyInput);
    dummyInput.value = token;
    dummyInput.select();
    document.execCommand('copy');
    document.body.removeChild(dummyInput);
  }
  alertSnack(){
    this._snackBar.open('📝 Copiado al portapapeles!', 'ok');
  }
  createUser(){
    const messageError = this.errorMessage().nativeElement;
    if(this.formUser.controls?.['user'].invalid || this.formUser.controls?.['password'].invalid){
      messageError.style.display = 'block';
    } else {
      this.territoryDataService.postUser(this.formUser.value);
    }
  }

  @needConfirmation({title: 'Eliminar usuario', message: '¿Estás seguro de eliminar este usuario?'})
  deleteUser(idUser: string){
    this.territoryDataService.deleteUser(idUser);
  }
}
