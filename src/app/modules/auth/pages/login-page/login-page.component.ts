import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent implements OnInit {

  @ViewChild('errorMessage', {static: false}) errorMessage: any;

  formLogin: FormGroup;
  user = "";
  password = "";

  constructor(private router: Router, private fb: FormBuilder,) { 
    this.formLogin = this.fb.group({
      user: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required])
    })
  }

  ngOnInit(): void {
  }

  async loginWhitUser(){
    const messageError = this.errorMessage.nativeElement;
    if(this.formLogin.value.user === "conductor" && this.formLogin.value.password === "PREDICAR241314"){
      console.log("CONDUCTOR: ", this.formLogin.value);
      localStorage.setItem("tokenConductor", "ei9qjwifojaiosdjfalksdfconductorlksjdfkljasldkfafklaksflk");
      this.router.navigate(['home']);
    } else if(this.formLogin.value.user === "adminTerritorios" && this.formLogin.value.password === "ganado.desierto.Amasias.2007"){
      console.log("ADMINISTRADOR: ", this.formLogin.value);
      localStorage.setItem("tokenAdmin", "lkjkldjfaklsdfjklasjdfkljkfaklsdjadminaklsjdfklajsdlfkjaskdlfjaskldfjklasdfa");
      this.router.navigate(['home']);
    } else {
      console.log("ERROR: ", this.formLogin.value);
      messageError.style.display = 'block';
    }
  }

  get User(){return this.formLogin.get('user');}
  get Password(){return this.formLogin.get('password');}
}
