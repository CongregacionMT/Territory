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
import {
  TerritoriesNumberData,
  TerritoryNumberData,
} from '@core/models/TerritoryNumberData';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { environment } from '@environments/environment';
import { CardButtonsData } from '@core/models/CardButtonsData';
import { BreadcrumbItem } from '@core/models/Breadcrumb';
import { Timestamp } from '@angular/fire/firestore';

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

  // Números de territorio disponibles según localidad seleccionada
  availableTerritoryNumbers = signal<TerritoryNumberData[]>([]);

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
      territory: new FormControl(null, [Validators.required]),
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

    // Cargar números de territorio y actualizar lista disponible
    this.loadTerritoryNumbers();
  }

  /** Carga los números de territorio desde sessionStorage o Firestore */
  private loadTerritoryNumbers(): void {
    const stored = sessionStorage.getItem('numberTerritory');
    if (stored) {
      this.territoryNumberOfLocalStorage.set(JSON.parse(stored));
      this.updateAvailableTerritories();
    } else {
      this.territorieDataService.getNumberTerritory().subscribe((data) => {
        if (data && data.length > 0) {
          const mapped: TerritoriesNumberData = {};
          data.forEach((entry: any) => {
            // El documento de NumberTerritory tiene claves por localidad
            Object.keys(entry).forEach((k) => {
              if (k !== 'id') mapped[k] = entry[k];
            });
          });
          sessionStorage.setItem('numberTerritory', JSON.stringify(mapped));
          this.territoryNumberOfLocalStorage.set(mapped);
          this.updateAvailableTerritories();
        }
      });
    }
  }

  /** Actualiza los números disponibles según la localidad seleccionada en el formulario */
  updateAvailableTerritories(): void {
    const location = this.formCard().get('location')?.value || '';
    const allNumbers = this.territoryNumberOfLocalStorage();

    // Intentar hacer match: la clave del storage puede ser 'wheelwright', 'rural', etc.
    const matchKey = Object.keys(allNumbers).find(
      (k) =>
        k.toLowerCase() === location.toLowerCase() ||
        location.toLowerCase().includes(k.toLowerCase()),
    );

    const territories: TerritoryNumberData[] = matchKey
      ? allNumbers[matchKey]
      : [];
    this.availableTerritoryNumbers.set(territories);

    // Resetear el valor del territorio cuando cambia la localidad
    if (territories.length > 0) {
      this.formCard().get('territory')?.setValue(territories[0].territorio);
    } else {
      this.formCard().get('territory')?.setValue(null);
    }
  }

  /** Se llama cuando el usuario cambia la localidad en el formulario */
  onLocationChange(): void {
    this.updateAvailableTerritories();
  }

  // Territorios personales pedidos
  async postCardAssigned() {
    // ⚠️ IMPORTANTE: capturar todos los valores ANTES de cualquier await,
    // porque el modal de Bootstrap puede cerrar/resetear el formulario mientras se espera.
    const locationDisplay: string =
      this.formCard().get('location')?.value || '';
    const publisher: string = this.formCard().get('publisher')?.value || '';
    const territory: string | number = this.formCard().get('territory')?.value;
    const dateStr: string = this.formCard().get('date')?.value || '';

    const territoryNumber = parseInt(String(territory), 10);
    const assignedDate = dateStr ? new Date(dateStr) : new Date();
    const expiryDate = new Date(assignedDate);
    expiryDate.setMonth(expiryDate.getMonth() + 2);

    // Derivar la clave de localidad desde el environment para que coincida exactamente
    // con el path de la URL en estadísticas (ej: 'wheelwright', 'rural')
    const localityConfig = (environment.localities || []).find(
      (l) => l.name?.toLowerCase() === locationDisplay.toLowerCase(),
    );
    const localityKey = localityConfig
      ? localityConfig.key
      : locationDisplay.toLowerCase();

    // Guardar tarjeta en la colección Assigned
    const cardData = {
      location: locationDisplay,
      publisher,
      territory: territoryNumber,
      date: dateStr,
      driver: publisher,
      creation: assignedDate,
    };
    await this.territorieDataService.postCardAssigned(cardData as any);

    this.formCard().reset({
      location: this.congregationName,
      publisher: '',
      territory: null,
      date: new Date().toISOString().substring(0, 10),
    });
    this.updateAvailableTerritories();
  }

  async deleteCardAssigned(card: Card) {
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
