import { Component, OnInit, ViewChild} from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators } from '@angular/forms';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';

@Component({
  selector: 'app-card-territory',
  templateUrl: './card-territory.component.html',
  styleUrls: ['./card-territory.component.scss'],
})
export class CardTerritoryComponent implements OnInit {

  routerBreadcrum: any = [];
  applesData: Array<any> = [
    {
      name: 'Manzana 1',
      checked: true,
    },
    {
      name: 'Manzana 2',
      checked: true,
    },
    {
      name: 'Manzana 3',
      checked: false,
    },
    {
      name: 'Manzana 4',
      checked: false,
    },
    {
      name: 'Manzana 5',
      checked: false,
    },
  ];
  formCard: FormGroup;
  driverError: boolean = false;
  startError: boolean = false;
  constructor(
    private routerBreadcrumMockService: RouterBreadcrumMockService,
    private fb: FormBuilder
  ) {
    this.routerBreadcrum = routerBreadcrumMockService.getBreadcrum();
    this.formCard = this.fb.group({
      driver: new FormControl('', [Validators.required]),
      checkArray: new FormArray([]),
      start: new FormControl('', [Validators.required]),
      end: new FormControl(''),
      comments: ['']
    })
  }

  ngOnInit(): void {
    this.routerBreadcrum = this.routerBreadcrum[9];
    const checkArray: FormArray = this.formCard.get('checkArray') as FormArray;
    this.applesData.forEach((manzana) => {
      if(manzana.checked === true){
        checkArray.push(new FormControl(manzana.name));
      }
    })
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
}
