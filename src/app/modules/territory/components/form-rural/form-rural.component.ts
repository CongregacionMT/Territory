import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { DataRural } from '@core/models/DataRural';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';

@Component({
    selector: 'app-form-rural',
    templateUrl: './form-rural.component.html',
    styleUrls: ['./form-rural.component.scss'],
    standalone: false
})
export class FormRuralComponent implements OnInit {

  formRoad: FormGroup;
  @Input() editionForm: DataRural | undefined;
  constructor(
    private spinner: SpinnerService,
    private territorieDataService: TerritoryDataService,
    private fb: FormBuilder
  ) {
    this.formRoad = this.fb.group({
      title: new FormControl("", [Validators.required]),
      distance: new FormControl("", [Validators.required]),
      vehicle: new FormControl("", [Validators.required]),
      time: new FormControl("", [Validators.required]),
      lastDate: new FormControl(""),
    });
  }

  ngOnInit(): void {
    if(this.editionForm !== undefined){
      this.formRoad.patchValue({title: this.editionForm.title});
      this.formRoad.patchValue({distance: this.editionForm.distance});
      this.formRoad.patchValue({vehicle: this.editionForm.vehicle});
      this.formRoad.patchValue({time: this.editionForm.time});
      this.formRoad.patchValue({lastDate: this.editionForm.lastDate});
    } else {
      this.formRoad.reset();
    }
  }
  postForm(roadId?: string){
    this.spinner.cargarSpinner();
    if(roadId === null) roadId = undefined;
    if(roadId === undefined){
      this.territorieDataService.postNewRoad(this.formRoad.value);
    } else {
      this.territorieDataService.putNewRoad(this.formRoad.value, roadId);
    }
    this.formRoad.reset();
  }
}
