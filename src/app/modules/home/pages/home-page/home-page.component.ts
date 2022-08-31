import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit {

  isAdmin: boolean = false;
  isDriver: boolean = false;
  btnLogin: boolean = false;
  constructor(private router: Router) { }

  ngOnInit(): void {
    if(localStorage.getItem("tokenAdmin")){
      this.isAdmin = true;
    } else if(localStorage.getItem("tokenConductor")){
      this.isDriver = true;
    }

    // Mostrar boton de loguearse
    
    this.isAdmin === true && this.isDriver === false ? this.btnLogin = false :this.btnLogin = true;

    this.isAdmin === false && this.isDriver === true ? this.btnLogin = false :this.btnLogin = true;

    this.isAdmin === false && this.isDriver === false ? this.btnLogin = true: this.btnLogin = false
  }

  logout(){
    localStorage.clear();
    this.router.navigate(['auth'])
  }
}
