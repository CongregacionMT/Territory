import { Component, Input, OnInit, inject } from '@angular/core';
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
  @Input() editionForm: DataRural | undefined;

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
