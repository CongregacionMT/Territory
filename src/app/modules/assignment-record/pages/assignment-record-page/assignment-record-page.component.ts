import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
  HostListener,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Card } from '@core/models/Card';
import { CardService } from '@core/services/card.service';
import { SpinnerService } from '@core/services/spinner.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { StorageService } from '@core/services/storage.service';
import { tap } from 'rxjs';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { TerritoriesNumberData, TerritoryNumberData } from '@core/models/TerritoryNumberData';
import { CardXlComponent } from '../../../../shared/components/card-xl/card-xl.component';
import { DatePipe, TitleCasePipe, NgClass } from '@angular/common';
import { environment } from '@environments/environment';
import { CardButtonsData } from '@core/models/CardButtonsData';
import { Timestamp } from '@angular/fire/firestore';
import { parseFirebaseDate } from '@shared/utils/date-utils';

@Component({
  selector: 'app-assignment-record-page',
  templateUrl: './assignment-record-page.component.html',
  styleUrls: ['./assignment-record-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardXlComponent, RouterLink, ReactiveFormsModule, DatePipe, TitleCasePipe, NgClass],
})
export class AssignmentRecordPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private territorieDataService = inject(TerritoryDataService);
  private cardService = inject(CardService);
  private router = inject(Router);
  private spinner = inject(SpinnerService);
  private fb = inject(FormBuilder);
  private cdRef = inject(ChangeDetectorRef);
  private storageService = inject(StorageService);

  // Signals para el estado del componente
  territorioMaps = signal<CardButtonsData[]>([]);
  allCardsAssigned = toSignal(this.territorieDataService.getCardAssigned(), { initialValue: [] });
  allCardsReceived = toSignal(
    this.territorieDataService
      .getRevisionCardTerritorie()
      .pipe(tap(() => this.spinner.cerrarSpinner())),
    { initialValue: [] },
  );
  cardConfirmation = signal<Card | null>(null);
  isCreationModalOpen = signal(false);
  formCard = signal<FormGroup>(this.createFormCard());
  territoryNumberOfLocalStorage = signal<TerritoriesNumberData>({});
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

  constructor() {
    this.spinner.cargarSpinner();
  }

  private createFormCard(): FormGroup {
    return this.fb.group({
      // eslint-disable-next-line @typescript-eslint/unbound-method
      location: new FormControl(this.congregationName, [Validators.required]),
      // eslint-disable-next-line @typescript-eslint/unbound-method
      publisher: new FormControl('', [Validators.required]),
      // eslint-disable-next-line @typescript-eslint/unbound-method
      territory: new FormControl(null, [Validators.required]),
      // eslint-disable-next-line @typescript-eslint/unbound-method
      date: new FormControl(new Date().toISOString().substring(0, 10), [Validators.required]),
    });
  }

  isOverdue(
    dateValue:
      | Date
      | string
      | number
      | Timestamp
      | { seconds: number; nanoseconds?: number; toDate?: () => Date }
      | undefined,
  ): boolean {
    const cardDate = parseFirebaseDate(dateValue);
    if (!cardDate || cardDate.getTime() === 0) return false;

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    return cardDate < twoMonthsAgo;
  }

  getReturnDate(
    dateValue:
      | Date
      | string
      | number
      | Timestamp
      | { seconds: number; nanoseconds?: number; toDate?: () => Date }
      | undefined,
  ): Date {
    return parseFirebaseDate(dateValue);
  }

  ngOnInit(): void {
    if (!this.storageService.getItem('territorioMaps')) {
      this.spinner.cargarSpinner();
      this.territorieDataService
        .getMaps()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((map) => {
          const maps = map[0].maps.map((m: CardButtonsData) => {
            if (m.name === 'urbano') {
              return { ...m, name: this.congregationName };
            }
            return m;
          });
          this.storageService.setItem('territorioMaps', maps);
          this.territorioMaps.set(maps);
          this.spinner.cerrarSpinner();
        });
    } else {
      const storedTerritorioMaps = this.storageService.getItem<CardButtonsData[]>('territorioMaps');
      this.territorioMaps.set(storedTerritorioMaps || []);
    }

    // Cargar números de territorio y actualizar lista disponible
    this.loadTerritoryNumbers();
  }

  /** Carga los números de territorio desde sessionStorage o Firestore */
  private loadTerritoryNumbers(): void {
    const stored = this.storageService.getItem<TerritoriesNumberData>('numberTerritory');
    if (stored) {
      this.territoryNumberOfLocalStorage.set(stored);
      this.updateAvailableTerritories();
    } else {
      this.territorieDataService
        .getNumberTerritory()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((data) => {
          if (data && data.length > 0) {
            const mapped: TerritoriesNumberData = {};
            (data as unknown[]).forEach((entry: unknown) => {
              const typedEntry = entry as Record<string, TerritoryNumberData[]>;
              // El documento de NumberTerritory tiene claves por localidad
              Object.keys(typedEntry).forEach((k) => {
                if (k !== 'id') mapped[k] = typedEntry[k];
              });
            });
            this.storageService.setItem('numberTerritory', mapped);
            this.territoryNumberOfLocalStorage.set(mapped);
            this.updateAvailableTerritories();
          }
        });
    }
  }

  /** Actualiza los números disponibles según la localidad seleccionada en el formulario */
  updateAvailableTerritories(): void {
    const location = String(this.formCard().get('location')?.value || '');
    const allNumbers = this.territoryNumberOfLocalStorage();

    // Intentar hacer match: la clave del storage puede ser 'wheelwright', 'rural', etc.
    const matchKey = Object.keys(allNumbers).find(
      (k: string) =>
        k.toLowerCase() === String(location).toLowerCase() ||
        String(location).toLowerCase().includes(k.toLowerCase()),
    );

    const territories: TerritoryNumberData[] = matchKey ? allNumbers[matchKey] : [];
    this.availableTerritoryNumbers.set(territories);

    // Resetear el valor del territorio cuando cambia la localidad
    if (territories.length > 0) {
      this.formCard().get('territory')?.setValue(territories[0].territorio);
    } else {
      this.formCard().get('territory')?.setValue(null);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeModals();
  }

  /** Se llama cuando el usuario cambia la localidad en el formulario */
  onLocationChange(): void {
    this.updateAvailableTerritories();
  }

  // Territorios personales pedidos
  async postCardAssigned(): Promise<void> {
    // ⚠️ IMPORTANTE: capturar todos los valores ANTES de cualquier await,
    // porque el modal de Bootstrap puede cerrar/resetear el formulario mientras se espera.
    const locationDisplay: string = String(this.formCard().get('location')?.value || '');
    const publisher: string = String(this.formCard().get('publisher')?.value || '');
    const territory: string | number = this.formCard().get('territory')?.value as string | number;
    const dateStr: string = String(this.formCard().get('date')?.value || '');

    const territoryNumber = parseInt(String(territory), 10);
    const assignedDate = dateStr ? new Date(dateStr) : new Date();

    // Guardar tarjeta en la colección Assigned
    const cardData: Partial<Card> = {
      location: locationDisplay,
      publisher,
      territory: String(territoryNumber),
      date: dateStr,
      driver: publisher,
      creation: assignedDate,
      applesData: [],
    } as Partial<Card>;

    await this.territorieDataService.postCardAssigned(cardData as Card);

    this.formCard().reset({
      location: this.congregationName,
      publisher: '',
      territory: null,
      date: new Date().toISOString().substring(0, 10),
    });
    this.updateAvailableTerritories();
    this.closeModals();
  }

  deleteCardAssigned(card: Card): void {
    this.territorieDataService.deleteCardAssigned(card);
  }

  // Tarjetas en revisión
  cardReceived(card: Card): void {
    this.cardService.goRevisionCard(card);
  }

  cardConfirmationDelete(card: Card): void {
    this.cardConfirmation.set(card);
    this.cdRef.detectChanges(); // Fuerza la actualización
  }

  cardDelete(): void {
    const card = this.cardConfirmation();
    if (card) {
      this.territorieDataService.deleteCardTerritorie(card);
      this.closeModals();
    }
  }

  closeModals(): void {
    this.cardConfirmation.set(null);
    this.isCreationModalOpen.set(false);
  }
}
