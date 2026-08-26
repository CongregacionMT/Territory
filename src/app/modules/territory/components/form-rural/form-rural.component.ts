import { Component, OnInit, inject, input, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  ValidationErrors,
  AbstractControl,
} from '@angular/forms';
import { DataRural } from '@core/models/DataRural';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';

@Component({
  selector: 'app-form-rural',
  templateUrl: './form-rural.component.html',
  styleUrls: ['./form-rural.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
})
export class FormRuralComponent implements OnInit {
  private spinner = inject(SpinnerService);
  private territorieDataService = inject(TerritoryDataService);
  private fb = inject(FormBuilder);

  formRoad: FormGroup;
  readonly editionForm = input<DataRural>();
  constructor() {
    this.formRoad = this.fb.group({
      title: new FormControl('', [
        (control: AbstractControl): ValidationErrors | null => Validators.required(control),
      ]),
      distance: new FormControl('', [
        (control: AbstractControl): ValidationErrors | null => Validators.required(control),
      ]),
      vehicle: new FormControl('', [
        (control: AbstractControl): ValidationErrors | null => Validators.required(control),
      ]),
      time: new FormControl('', [
        (control: AbstractControl): ValidationErrors | null => Validators.required(control),
      ]),
      lastDate: new FormControl(''),
    });
  }

  ngOnInit(): void {
    const editionForm = this.editionForm();
    if (editionForm) {
      this.formRoad.patchValue(editionForm);
    } else {
      this.formRoad.reset();
    }
  }

  postForm(roadId?: string): void {
    this.spinner.cargarSpinner();
    if (roadId === null) roadId = undefined;
    if (roadId === undefined) {
      void this.territorieDataService.postNewRoad(this.formRoad.value as DataRural);
    } else {
      void this.territorieDataService.putNewRoad(this.formRoad.value as DataRural, roadId);
    }
    this.formRoad.reset();
  }
}
