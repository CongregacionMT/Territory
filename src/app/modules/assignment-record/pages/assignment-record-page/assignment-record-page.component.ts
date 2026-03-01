import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
  signal,
  computed,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Card, CardApplesData } from '@core/models/Card';
import { CardService } from '@core/services/card.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { TerritoriesNumberData } from '@core/models/TerritoryNumberData';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { environment } from '@environments/environment';
import { CardButtonsData } from '@core/models/CardButtonsData';
import { BreadcrumbItem } from '@core/models/Breadcrumb';

@Component({
  selector: 'app-assignment-record-page',
  templateUrl: './assignment-record-page.component.html',
  styleUrls: ['./assignment-record-page.component.scss'],
  imports: [
    BreadcrumbComponent,
    CardXlComponent,
    RouterLink,
    ReactiveFormsModule,
    DatePipe,
    TitleCasePipe,
  ],
})
export class AssignmentRecordPageComponent implements OnInit {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private territorieDataService = inject(TerritoryDataService);
  private cardService = inject(CardService);
  private router = inject(Router);
  private spinner = inject(SpinnerService);
  private fb = inject(FormBuilder);
  private cdRef = inject(ChangeDetectorRef);

  // Signals para el estado del componente
  routerBreadcrum = signal<BreadcrumbItem[]>([]);
  territorioMaps = signal<CardButtonsData[]>([]);
  allCardsReceived = signal<Card[]>([]);
  allCardsAssigned = signal<Card[]>([]);
  cardConfirmation = signal<Card | null>(null);
  formCard = signal<FormGroup>(this.createFormCard());
  territoryNumberOfLocalStorage = signal<TerritoriesNumberData>(
    {} as TerritoriesNumberData,
  );
  appleCount = signal<number>(0);
  congregationName = environment.congregationName;
  congregationKey = environment.congregationKey;
  localitiesKeys = signal(environment.localities || []);
  storageKey = signal('');

  // Computed signals (opcional, para valores derivados)
  hasCardsReceived = computed(() => this.allCardsReceived().length > 0);
  hasCardsAssigned = computed(() => this.allCardsAssigned().length > 0);
  hasTerritoryMaps = computed(() => this.territorioMaps().length > 0);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    this.spinner.cargarSpinner();

    // get tarjetas asignadas esta semana
    this.territorieDataService.getCardAssigned().subscribe((card) => {
      this.allCardsAssigned.set(card);
    });

    // get tarjetas a revisión
    this.territorieDataService.getRevisionCardTerritorie().subscribe((card) => {
      this.allCardsReceived.set(card);
      this.cardConfirmation.set(JSON.parse(JSON.stringify(card)));
      this.spinner.cerrarSpinner();
    });
  }

  private createFormCard(): FormGroup {
    return this.fb.group({
      location: new FormControl(this.congregationName, [Validators.required]),
      publisher: new FormControl('', [Validators.required]),
      territory: new FormControl(1, [Validators.required]),
      date: new FormControl(new Date().toISOString().substring(0, 10), [
        Validators.required,
      ]),
    });
  }

  isOverdue(assignmentDate: any): boolean {
    if (!assignmentDate) return false;

    // Handle both string and Firebase Timestamp
    const date = assignmentDate.toDate
      ? assignmentDate.toDate()
      : new Date(assignmentDate);
    const returnDate = new Date(date);
    returnDate.setMonth(returnDate.getMonth() + 2);

    return new Date() > returnDate;
  }

  getReturnDate(assignmentDate: any): Date | null {
    if (!assignmentDate) return null;
    const date = assignmentDate.toDate
      ? assignmentDate.toDate()
      : new Date(assignmentDate);
    const returnDate = new Date(date);
    returnDate.setMonth(returnDate.getMonth() + 2);
    return returnDate;
  }

  ngOnInit(): void {
    const breadcrumData = this.routerBreadcrumMockService.getBreadcrum();
    this.routerBreadcrum.set(breadcrumData[2]);

    if (!sessionStorage.getItem('territorioMaps')) {
      this.spinner.cargarSpinner();
      this.territorieDataService.getMaps().subscribe((map) => {
        const maps = map[0].maps.map((m: CardButtonsData) => {
          if (m.name === 'urbano') {
            return { ...m, name: this.congregationName };
          }
          return m;
        });
        sessionStorage.setItem('territorioMaps', JSON.stringify(maps));
        this.territorioMaps.set(maps);
        this.spinner.cerrarSpinner();
      });
    } else {
      const storedTerritorioMaps = sessionStorage.getItem('territorioMaps');
      this.territorioMaps.set(
        storedTerritorioMaps ? JSON.parse(storedTerritorioMaps) : [],
      );
    }

    // Generar storage keys dinámicamente desde environment
    // Nota: El pre-cacheo se ha movido a los componentes específicos de cada localidad
    // para evitar colisiones y asegurar el orden correcto de los datos.
  }

  // Territorios personales pedidos
  postCardAssigned() {
    const formValue = this.formCard().value;
    // Map publisher to driver for backward compatibility with the Assigned collection
    const cardData = {
      ...formValue,
      driver: formValue.publisher,
      creation: formValue.date ? new Date(formValue.date) : new Date(),
    };
    this.territorieDataService.postCardAssigned(cardData as any);
    this.formCard().reset();
  }

  deleteCardAssigned(card: Card) {
    this.territorieDataService.deleteCardAssigned(card);
  }

  // Tarjetas en revisión
  cardReceived(card: Card) {
    this.cardService.goRevisionCard(card);
  }

  cardConfirmationDelete(card: Card) {
    this.cardConfirmation.set(card);
    this.cdRef.detectChanges(); // Fuerza la actualización
  }

  cardDelete() {
    const card = this.cardConfirmation();
    if (card) {
      this.territorieDataService.deleteCardTerritorie(card);
    }
  }
}
