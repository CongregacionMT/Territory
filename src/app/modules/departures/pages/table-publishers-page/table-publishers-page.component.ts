import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '../../../../core/services/territory-data.service';
import { Group } from '@core/models/Group';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-table-publishers-page',
  templateUrl: './table-publishers-page.component.html',
  styleUrls: ['./table-publishers-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class TablePublishersPageComponent {
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);

  groupList = toSignal(
    this.territoryDataService.getGroupList().pipe(tap(() => this.spinner.cerrarSpinner())),
    { initialValue: [] as Group[] },
  );

  constructor() {
    this.spinner.cargarSpinner();
  }
}
