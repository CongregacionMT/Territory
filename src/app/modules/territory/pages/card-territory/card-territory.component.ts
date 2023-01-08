import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { ActivatedRoute, Params } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { CardService } from '@core/services/card.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { Subscription } from 'rxjs';
import { SpinnerService } from '@core/services/spinner.service';
@Component({
  selector: 'app-card-territory',
  templateUrl: './card-territory.component.html',
  styleUrls: ['./card-territory.component.scss'],
})
export class CardTerritoryComponent implements OnInit, OnDestroy {
  card: any = {
    id: "",
    location: 'Maria Teresa',
    numberTerritory: 1,
    driver: '',
    start: '',
    end: '',
    link: '',
    comments: '',
    creation: '',
    applesData: [{name:'', checked: false}],
    revision: false,
    revisionComplete: false
  }
  iframe: any;
  path: string = "";
  routerBreadcrum: any = [];
  formCard: FormGroup;
  driverError: boolean = false;
  startError: boolean = false;
  endError: boolean = false;
  cardSubscription: Subscription;
  countTrueApples: number = 0;
  countFalseApples: number = 0;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private fb: FormBuilder,
    private domSanitizer: DomSanitizer,
    private territorieDataService: TerritoryDataService,
    private cardService: CardService,
    private activatedRoute: ActivatedRoute,
    private spinner: SpinnerService
    ) {
    this.spinner.cargarSpinner();
    this.cardSubscription = Subscription.EMPTY;      
    this.formCard = this.fb.group({
      driver: new FormControl(this.card.driver, [Validators.required]),
      applesData: new FormArray([]),
      start: new FormControl(this.card.start, [Validators.required]),
      end: new FormControl(this.card.end),
      comments: [this.card.comments]
    })
    // VALIDAR SI ESTOY REVISANDO O NO LA CARD
    if(this.cardService.dataCard.revision === true){
      // CARGO LOS DATOS DESDE EL SERVICIO PARA REVISAR LA CARD
      this.card = this.cardService.dataCard;
      this.formCard.patchValue({driver: this.card.driver});
      this.formCard.patchValue({start: this.card.start});
      this.formCard.patchValue({end: this.card.end});
      this.formCard.patchValue({comments: this.card.comments});
      this.card.applesData.map((apple: any) => {
        const applesData: FormArray = this.formCard.get('applesData') as FormArray;
        applesData.push(new FormControl({name: apple.name, checked: apple.checked}));
      });
      this.spinner.cerrarSpinner()
    } else {      
      // SI NO ESTOY REVISANDO LA CARD, ENTONCES MUESTRO LA ULTIMA TARJETA.
      this.path = this.activatedRoute.snapshot.params['collection'];
      this.cardSubscription = this.territorieDataService.getCardTerritorie(this.path).subscribe({
        next: card => {
          this.card = card[0];
          this.countTrueApples = 0;
          this.card.applesData.map((apple: any) => {
            const applesData: FormArray = this.formCard.get('applesData') as FormArray;
            applesData.push(new FormControl({name: apple.name, checked: apple.checked}));
            if(apple.checked === true){
              this.countTrueApples+=1;
            }
          });
          if(this.countTrueApples !== 0){
            this.formCard.patchValue({start: this.card.start});
          }
          this.countTrueApples=0;
          this.spinner.cerrarSpinner();
        }
      })
    }
  }
  
  ngOnInit(): void {
    // Breadcrum
    this.routerBreadcrum = this.routerBreadcrumMockService.getBreadcrum();
    this.routerBreadcrum = this.routerBreadcrum[9];
    // Carga de mapas para Maria Teresa
    if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-1"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1GOPjTgnhJgIJWBGZhvgc2eLcCnDkPS8&ehbc=2E312F" width="640" height="480" ></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-2"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=19aieXhqwTtRITjYep-bbz-eUHSiSevI&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-3"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=171gUWLdZm7IztqqimwF36j4Io86M6gY&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-4"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1kz4uJcy5eHHDJ2TEpa2qtQtr8adePVA&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-5"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1Empajc3TYA8cap0GQCfJjVQWgRe61FI&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-6"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1Syw58HcGT8bHqbblHjVxrgwiVDf7Y94&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-7"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1QeU9b0mYYzwl_JtHsXbbKyPLTLBh5rA&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-8"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=18FI1y5REupNlof33G0E_r4BjPoOYav4&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-9"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=19pecMpvGkGLA1K96X-lXgqMQpMqDXfo&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-10"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1Pd7I2FEdWn1fYYrpfU54hQTw6Fq3I-Q&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-11"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1ci-JKShrktVmKUob0Cd8C1gGIxfxZZY&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-12"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1CJoVzTewC4FJoy-xenubfUnKF567Oc8&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-13"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1HrURCAjWnd_Ja6GgY9BKalm0KsLQf24&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-14"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1VJPf3qsKrlcvZ3dYI7TxDdc7MTg-7cg&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-15"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=14UEzpZQY3EEeIUp1uYBmsfPDzoBTPUg&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-16"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1g9ON_q6_cUL-E79iV279EkGBaoTbzb0&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioMT-17"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1C7zcRXsMBUHUaMHEVcUcTM4tplXiQHc&ehbc=2E312F" width="640" height="480"></iframe>')
    }
    // Carga de mapas para Christophersen
    if(this.activatedRoute.snapshot.params['collection'] === "TerritorioC-1"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=10pgOS5R4I6tfnimIe5AXFyvh3JLDiWA&ehbc=2E312F" width="640" height="480"></iframe>')
    } else if(this.activatedRoute.snapshot.params['collection'] === "TerritorioC-2"){
      this.iframe = this.domSanitizer.bypassSecurityTrustHtml('<iframe src="https://www.google.com/maps/d/embed?mid=1lyGjwbGkuso-wkFednS3cTMgFqL7tLQ&ehbc=2E312F" width="640" height="480"></iframe>')
    }
  }

  onCheckboxChange(e:any){
    const applesData: FormArray = this.formCard.get('applesData') as FormArray;
    applesData.controls.forEach((item: any) => {
      if(item.value.name === e.target.value){   
        item.value.checked = e.target.checked;       
      }
    })
  }
  // Gets creados para poder validar los datos ingresados
  get driver(){return this.formCard.get('driver');}
  get start(){return this.formCard.get('start');}

  fillCard(){
    // Rellenar card con los datos ingresados
    this.card.driver = this.formCard.value.driver;
    this.card.start = this.formCard.value.start;
    this.card.end = this.formCard.value.end;
    this.card.comments = this.formCard.value.comments;      
    this.card.applesData = this.formCard.value.applesData;
  }

  submitForm(){
    // Validar formulario
    if(this.formCard.controls?.['driver'].invalid){
      this.driverError = this.formCard.controls?.['driver'].invalid;
      return;
    }
    if(this.formCard.controls?.['start'].invalid){
      this.startError = this.formCard.controls?.['start'].invalid;
      return;
    }
    if(this.formCard.controls?.['end'].value === ""){
      this.formCard.value.applesData.map((apple: any) => {
        if(apple.checked === false){
          this.countFalseApples+=1;
        }
      });
      if(this.countFalseApples === 0){
        this.endError = true;
        return;
      }
      this.countFalseApples=0;
    }
    this.driverError = false;
    this.startError = false;
    this.endError = false;

    this.spinner.cargarSpinner();
    this.fillCard();
    // Comparar si estoy revisando o no
    if(this.card.revision === true){
      this.territorieDataService.postCardTerritorie(this.card, this.card.link);
      this.territorieDataService.putCardTerritorie(this.card);
    } else {
      this.card.creation = Timestamp.now()
      this.territorieDataService.sendRevisionCardTerritorie(this.card);
    }
  }

  ngOnDestroy() {
    this.cardService.rollbackCard();
    this.card.revision = false;
    this.cardService.dataCard.revision = false;
    this.cardSubscription.unsubscribe();
  }
}
