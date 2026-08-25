import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, OnInit, inject, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '../../../../core/services/territory-data.service';
import { Group } from '@core/models/Group';
@Component({
  selector: 'app-table-publishers-page',
  templateUrl: './table-publishers-page.component.html',
  styleUrls: ['./table-publishers-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class TablePublishersPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private territoriyDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);

  groupList: Group[] = [];
  constructor() {
    this.spinner.cargarSpinner();
  }

  ngOnInit(): void {
    this.territoriyDataService
      .getGroupList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.groupList = data;
          this.spinner.cerrarSpinner();
        },
      });
  }
}
