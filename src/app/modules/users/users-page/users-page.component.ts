import { Component, ViewChild } from '@angular/core';
import { TerritoryDataService } from '../../../core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { needConfirmation } from '@shared/decorators/confirm-dialog.decorator';

interface User {
  user: string;
  password: string;
  rol: string;
  tokens: string[];
}

@Component({
    selector: 'app-users-page',
    templateUrl: './users-page.component.html',
    styleUrls: ['./users-page.component.scss'],
    imports: [ReactiveFormsModule]
})

export class UsersPageComponent {

  @ViewChild('errorMessage', {static: false}) errorMessage: any;

  users: User[] = [];

  formUser: FormGroup;
  user = null;
  password = null;
  rol = 'conductor';
  constructor(
    private territoryDataService: TerritoryDataService,
    private spinner: SpinnerService,
    private fb: FormBuilder,
    private _snackBar: MatSnackBar,
  ){
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
    const messageError = this.errorMessage.nativeElement;
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
