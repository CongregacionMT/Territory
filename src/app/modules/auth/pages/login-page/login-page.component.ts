import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { NgClass } from '@angular/common';

@Component({
    selector: 'app-login-page',
    templateUrl: './login-page.component.html',
    styleUrls: ['./login-page.component.scss'],
    imports: [ReactiveFormsModule, NgClass]
})
export class LoginPageComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);


  readonly errorMessage = viewChild<any>('errorMessage');

  formLogin: FormGroup;
  user = "";
  password = "";
  passwordVisible = signal(false);

  constructor() {
    this.formLogin = this.fb.group({
      user: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required])
    });
  }

  ngOnInit(): void {
    this.formLogin.get('user')?.valueChanges.subscribe(value => {
      const lower = value?.toLowerCase?.();
      if (value !== lower) {
        this.formLogin.get('user')?.setValue(lower, { emitEvent: false });
      }
    });
  }

  async loginWhitUser(){
    this.spinner.cargarSpinner();
    const messageError = this.errorMessage().nativeElement;
    this.territoryDataService.loginUser(
      this.formLogin.value.user,
      this.formLogin.value.password
    ).subscribe((user: any[]) => {
      if(user.length !== 0){
        if(user[0].rol === "admin"){
          localStorage.setItem("tokenAdmin", "lkjkldjfaklsdfjklasjdfkljkfaklsdjadminaklsjdfklajsdlfkjaskdlfjaskldfjklasdfa");
        } else {
          localStorage.setItem("tokenConductor", "ei9qjwifojaiosdjfalksdfconductorlksjdfkljasldkfafklaksflk");
        }
        localStorage.setItem(user[0].user, JSON.stringify(user[0]));
        localStorage.setItem('nombreConductor', user[0].user);
        this.router.navigate(['home']);
        this.spinner.cerrarSpinner();
      } else {
        console.log("ERROR: ", this.formLogin.value);
        messageError.style.display = 'block';
        this.spinner.cerrarSpinner();
      }
    })
  }
  togglePasswordVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible())
  }
  get User(){return this.formLogin.get('user');}
  get Password(){return this.formLogin.get('password');}
}
