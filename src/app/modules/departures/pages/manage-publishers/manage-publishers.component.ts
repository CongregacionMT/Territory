import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { SpinnerService } from '@core/services/spinner.service';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';

interface Publisher {
  name: string;
  assignment?: 'Superintendente' | 'Auxiliar' | '';
}

interface Group {
  id: string;
  publishers: Publisher[];
}

@Component({
  selector: 'app-manage-publishers',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, BreadcrumbComponent],
  templateUrl: './manage-publishers.component.html',
  styleUrls: ['./manage-publishers.component.scss']
})
export class ManagePublishersComponent implements OnInit {
  private territoryDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  private router = inject(Router);
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);

  routerBreadcrum: any = [];
  groups: Group[] = [];
  newPublisherName: { [groupId: string]: string } = {};

  ngOnInit(): void {
    // Check admin access
    if (!localStorage.getItem('tokenAdmin')) {
      this.router.navigate(['/salidas']);
      return;
    }

    // Initialize groups as empty array to prevent iterator errors
    this.groups = [];
    
    this.loadGroups();
  }

  loadGroups(): void {
    this.spinner.cargarSpinner();
    this.territoryDataService.getGroupList().subscribe({
      next: (data: any) => {
        console.log('Raw data from Firestore:', data);
        
        // Firestore returns an array of documents with id field
        if (Array.isArray(data)) {
          this.groups = data.map(group => ({
            id: group.id,
            publishers: Array.isArray(group.publishers) ? group.publishers : []
          }));
        } else {
          console.warn('Data is not an array:', data);
          this.groups = [];
        }
        
        // Sort groups by number
        this.groups.sort((a, b) => {
          const numA = parseInt(a.id.replace('Grupo ', '')) || 0;
          const numB = parseInt(b.id.replace('Grupo ', '')) || 0;
          return numA - numB;
        });
        
        console.log('Processed groups:', this.groups);
        this.spinner.cerrarSpinner();
      },
      error: (err) => {
        console.error('Error loading groups:', err);
        this.groups = [];
        this.spinner.cerrarSpinner();
      }
    });
  }

  addGroup(): void {
    const nextNumber = this.getNextGroupNumber();
    const newGroupId = `Grupo ${nextNumber}`;
    
    this.territoryDataService.setGroup(newGroupId, { publishers: [] }).then(() => {
      this.loadGroups();
    });
  }

  getNextGroupNumber(): number {
    if (this.groups.length === 0) return 1;
    
    const numbers = this.groups.map(g => parseInt(g.id.replace('Grupo ', ''))).sort((a, b) => a - b);
    return numbers[numbers.length - 1] + 1;
  }

  deleteGroup(groupId: string): void {
    if (confirm(`¿Estás seguro de eliminar ${groupId}?`)) {
      this.territoryDataService.deleteGroup(groupId).then(() => {
        this.loadGroups();
      });
    }
  }

  addPublisher(groupId: string): void {
    const name = this.newPublisherName[groupId]?.trim();
    if (!name) return;

    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;

    group.publishers.push({ name, assignment: '' });
    this.saveGroup(group);
    this.newPublisherName[groupId] = '';
  }

  removePublisher(groupId: string, index: number): void {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return;

    group.publishers.splice(index, 1);
    this.saveGroup(group);
  }

  onDrop(event: CdkDragDrop<Publisher[]>, targetGroupId: string): void {
    const targetGroup = this.groups.find(g => g.id === targetGroupId);
    if (!targetGroup) return;

    if (event.previousContainer === event.container) {
      // Reorder within same group
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.saveGroup(targetGroup);
    } else {
      // Move between groups
      const sourceGroupId = event.previousContainer.id;
      const sourceGroup = this.groups.find(g => g.id === sourceGroupId);
      
      if (sourceGroup) {
        transferArrayItem(
          event.previousContainer.data,
          event.container.data,
          event.previousIndex,
          event.currentIndex
        );
        this.saveGroup(sourceGroup);
        this.saveGroup(targetGroup);
      }
    }
  }

  updateAssignment(groupId: string, publisherIndex: number, assignment: string): void {
    const group = this.groups.find(g => g.id === groupId);
    if (!group || !group.publishers[publisherIndex]) return;

    group.publishers[publisherIndex].assignment = assignment as 'Superintendente' | 'Auxiliar' | '';
    this.saveGroup(group);
  }

  saveGroup(group: Group): void {
    this.territoryDataService.setGroup(group.id, { publishers: group.publishers });
  }

  getConnectedLists(): string[] {
    return this.groups.map(g => g.id);
  }
}
