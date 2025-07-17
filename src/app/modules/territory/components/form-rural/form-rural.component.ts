import { Component, OnInit, inject, input } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DataRural } from '@core/models/DataRural';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';

@Component({
    selector: 'app-form-rural',
    templateUrl: './form-rural.component.html',
    styleUrls: ['./form-rural.component.scss'],
    imports: [ReactiveFormsModule]
})
export class FormRuralComponent implements OnInit {
  private spinner = inject(SpinnerService);
  private territorieDataService = inject(TerritoryDataService);
  private fb = inject(FormBuilder);


  formRoad: FormGroup;
  readonly editionForm = input<DataRural>();

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    this.formRoad = this.fb.group({
      title: new FormControl("", [Validators.required]),
      distance: new FormControl("", [Validators.required]),
      vehicle: new FormControl("", [Validators.required]),
      time: new FormControl("", [Validators.required]),
      lastDate: new FormControl(""),
    });
  }

  ngOnInit(): void {
    const editionForm = this.editionForm();
    if(editionForm !== undefined){
      this.formRoad.patchValue({title: editionForm.title});
      this.formRoad.patchValue({distance: editionForm.distance});
      this.formRoad.patchValue({vehicle: editionForm.vehicle});
      this.formRoad.patchValue({time: editionForm.time});
      this.formRoad.patchValue({lastDate: editionForm.lastDate});
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
