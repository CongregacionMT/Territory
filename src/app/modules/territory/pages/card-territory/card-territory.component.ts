import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Card } from '@core/models/Card';
import { CardService } from '@core/services/card.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
@Component({
  selector: 'app-card-territory',
  templateUrl: './card-territory.component.html',
  styleUrls: ['./card-territory.component.scss'],
})
export class CardTerritoryComponent implements OnInit, OnDestroy {
  card: Card = {
    id: 0,
    location: 'Maria Teresa',
    numberTerritory: 1,
    iframe: '',
    driver: '',
    start: '',
    end: '',
    link: '',
    comments: '',
    applesData: [{name:'', checked: false}],
    revision: false
  }
  routerBreadcrum: any = [];
  formCard: FormGroup;
  driverError: boolean = false;
  startError: boolean = false;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private fb: FormBuilder,
    private domSanitizer: DomSanitizer,
    private cardService: CardService
  ) {
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();

    this.card.id = this.cardService.dataCard.id;
    this.card.location = this.cardService.dataCard.location;
    this.card.iframe = this.cardService.dataCard.iframe;
    this.card.applesData = this.cardService.dataCard.applesData;
    this.card.numberTerritory = this.cardService.dataCard.numberTerritory;
    this.card.revision = this.cardService.dataCard.revision;
    this.formCard = this.fb.group({
      driver: new FormControl(this.card.driver, [Validators.required]),
      checkArray: new FormArray([]),
      start: new FormControl(this.card.start, [Validators.required]),
      end: new FormControl(this.card.end),
      comments: ['']
    })
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[9];
    const checkArray: FormArray = this.formCard.get('checkArray') as FormArray;
    this.card.applesData.forEach((manzana) => {
      if(manzana.checked === true){
        checkArray.push(new FormControl(manzana.name));
      }
    })
    this.card.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1GOPjTgnhJgIJWBGZhvgc2eLcCnDkPS8&ehbc=2E312F" width="640" height="480" ></iframe>')
  }

  onCheckboxChange(e:any){
    const checkArray: FormArray = this.formCard.get('checkArray') as FormArray;
    if(e.target.checked){
      checkArray.push(new FormControl(e.target.value));
    } else {
      let i = 0;
      checkArray.controls.forEach((item: any) => {
        if(item.value === e.target.value){
          checkArray.removeAt(i);
          return;
        }
        i++
      })
    }
  }
  // Gets creados para poder validar los datos ingresados
  get driver(){return this.formCard.get('driver');}
  get start(){return this.formCard.get('start');}

  submitForm(){
    if (this.formCard.invalid) {
      if(this.formCard.controls?.['driver'].invalid){
        this.driverError = this.formCard.controls?.['driver'].invalid;
        return;
      }
      if(this.formCard.controls?.['start'].invalid){
        this.driverError = false;
        this.startError = this.formCard.controls?.['start'].invalid;
      }
    } else {
      this.driverError = false;
      this.startError = false;
      console.log(this.formCard.value);
    }
  }

  ngOnDestroy() {
    this.cardService.rollbackCard();
    this.card.revision = false;
  }
}
