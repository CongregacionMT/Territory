import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  DestroyRef,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { Group, Publisher } from '@core/models/Group';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-manage-publishers',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './manage-publishers.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./manage-publishers.component.scss'],
})
export class ManagePublishersComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private router = inject(Router);
  private authService = inject(AuthService);
  groups = signal<Group[]>([]);
  newPublisherName: { [groupId: string]: string } = {};

  ngOnInit(): void {
    // Check admin access
    if (!this.authService.isAdmin()) {
      void this.router.navigate(['/salidas']);
      return;
    }

    // Initialize groups as empty array to prevent iterator errors
    this.groups.set([]);

    this.loadGroups();
  }

  loadGroups(): void {
    this.spinner.cargarSpinner();
    this.territoryDataService
      .getGroupList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: Group[]) => {
          // Firestore returns an array of documents with id field
          let parsedGroups: Group[] = [];
          if (Array.isArray(data)) {
            parsedGroups = data.map((group) => ({
              id: group.id,
              publishers: Array.isArray(group.publishers) ? group.publishers : [],
            }));
          }

          // Sort groups by number
          parsedGroups.sort((a, b) => {
            const numA = parseInt(a.id.replace('Grupo ', '')) || 0;
            const numB = parseInt(b.id.replace('Grupo ', '')) || 0;
            return numA - numB;
          });

          this.groups.set(parsedGroups);

          this.spinner.cerrarSpinner();
        },
        error: () => {
          this.groups.set([]);
          this.spinner.cerrarSpinner();
        },
      });
  }

  addGroup(): void {
    const nextNumber = this.getNextGroupNumber();
    const newGroupId = `Grupo ${nextNumber}`;

    void this.territoryDataService.setGroup(newGroupId, { publishers: [] }).then(() => {
      this.loadGroups();
    });
  }

  getNextGroupNumber(): number {
    const currentGroups = this.groups();
    if (currentGroups.length === 0) return 1;

    const numbers = currentGroups
      .map((g) => parseInt(g.id.replace('Grupo ', '')))
      .sort((a, b) => a - b);
    return numbers[numbers.length - 1] + 1;
  }

  deleteGroup(groupId: string): void {
    if (confirm(`¿Estás seguro de eliminar ${groupId}?`)) {
      void this.territoryDataService.deleteGroup(groupId).then(() => {
        this.loadGroups();
      });
    }
  }

  addPublisher(groupId: string): void {
    const name = this.newPublisherName[groupId]?.trim();
    if (!name) return;

    const currentGroups = this.groups();
    const groupIndex = currentGroups.findIndex((g) => g.id === groupId);
    if (groupIndex === -1) return;

    const group = currentGroups[groupIndex];
    const newPublishers = [...group.publishers, { name, assignment: '' as const }];

    this.groups.update((groups) => {
      const copy = [...groups];
      copy[groupIndex] = { ...group, publishers: newPublishers };
      return copy;
    });

    this.saveGroup({ ...group, publishers: newPublishers });
    this.newPublisherName[groupId] = '';
  }

  removePublisher(groupId: string, index: number): void {
    const currentGroups = this.groups();
    const groupIndex = currentGroups.findIndex((g) => g.id === groupId);
    if (groupIndex === -1) return;

    const group = currentGroups[groupIndex];
    const newPublishers = [...group.publishers];
    newPublishers.splice(index, 1);

    this.groups.update((groups) => {
      const copy = [...groups];
      copy[groupIndex] = { ...group, publishers: newPublishers };
      return copy;
    });

    this.saveGroup({ ...group, publishers: newPublishers });
  }

  onDrop(event: CdkDragDrop<Publisher[]>, targetGroupId: string): void {
    const currentGroups = this.groups();

    if (event.previousContainer === event.container) {
      // Reorder within same group
      const groupIndex = currentGroups.findIndex((g) => g.id === targetGroupId);
      if (groupIndex === -1) return;

      const group = currentGroups[groupIndex];
      const newPublishers = [...group.publishers];
      moveItemInArray(newPublishers, event.previousIndex, event.currentIndex);

      if (event.previousIndex !== event.currentIndex) {
        this.groups.update((groups) => {
          const copy = [...groups];
          copy[groupIndex] = { ...group, publishers: newPublishers };
          return copy;
        });
        const targetGroup = this.groups()[groupIndex];
        this.saveGroup(targetGroup);
      }
    } else {
      // Move between groups
      const sourceGroupId = event.previousContainer.id;

      const sourceIndex = currentGroups.findIndex((g) => g.id === sourceGroupId);
      const targetIndex = currentGroups.findIndex((g) => g.id === targetGroupId);

      if (sourceIndex !== -1 && targetIndex !== -1) {
        const sourceGroup = currentGroups[sourceIndex];
        const targetGroup = currentGroups[targetIndex];

        const newSourcePublishers = [...sourceGroup.publishers];
        const newTargetPublishers = [...targetGroup.publishers];

        transferArrayItem(
          newSourcePublishers,
          newTargetPublishers,
          event.previousIndex,
          event.currentIndex,
        );

        this.groups.update((groups) => {
          const copy = [...groups];
          copy[sourceIndex] = { ...sourceGroup, publishers: newSourcePublishers };
          copy[targetIndex] = { ...targetGroup, publishers: newTargetPublishers };
          return copy;
        });

        this.saveGroup({ ...sourceGroup, publishers: newSourcePublishers });
        this.saveGroup({ ...targetGroup, publishers: newTargetPublishers });
      }
    }
  }

  updateAssignment(groupId: string, publisherIndex: number, assignment: string): void {
    const currentGroups = this.groups();
    const groupIndex = currentGroups.findIndex((g) => g.id === groupId);
    if (groupIndex === -1) return;

    const group = currentGroups[groupIndex];
    if (!group.publishers[publisherIndex]) return;

    const newPublishers = [...group.publishers];
    newPublishers[publisherIndex] = {
      ...newPublishers[publisherIndex],
      assignment: assignment as 'Superintendente' | 'Auxiliar' | '',
    };

    this.groups.update((groups) => {
      const copy = [...groups];
      copy[groupIndex] = { ...group, publishers: newPublishers };
      return copy;
    });

    this.saveGroup({ ...group, publishers: newPublishers });
  }

  saveGroup(group: Group): void {
    void this.territoryDataService.setGroup(group.id, { publishers: group.publishers });
  }
}
