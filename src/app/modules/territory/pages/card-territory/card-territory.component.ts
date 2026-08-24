import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
  viewChild,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { TitleCasePipe, NgClass } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardService } from '@core/services/card.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Subscription } from 'rxjs';
import { SpinnerService } from '@core/services/spinner.service';
import { NetworkService } from '@core/services/network.service';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { FocusInvalidInputDirective } from '../../../../shared/directives/focus-invalid-input.directive';
import { ModalComponent as ModalComponent_1 } from '../../../../shared/components/modal/modal.component';
import { CampaignService } from '@core/services/campaign.service';
import { environment } from '@environments/environment';

import { Card, CardApplesData } from '@core/models/Card';
import { User } from '@core/models/User';

import { TerritoryMapComponent } from '../../components/territory-map/territory-map.component';

@Component({
  selector: 'app-card-territory',
  templateUrl: './card-territory.component.html',
  styleUrls: ['./card-territory.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ReactiveFormsModule,
    FocusInvalidInputDirective,
    RouterLink,
    ModalComponent_1,
    TitleCasePipe,
    NgClass,
    TerritoryMapComponent,
  ],
})
export class CardTerritoryComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private territorieDataService = inject(TerritoryDataService);
  private cardService = inject(CardService);
  private activatedRoute = inject(ActivatedRoute);
  private spinner = inject(SpinnerService);
  private campaignService = inject(CampaignService);
  private router = inject(Router);
  public networkService = inject(NetworkService);

  card = signal<Card>({
    id: '',
    location: environment.congregationName,
    territoryNumber: 1,
    driver: '',
    start: '',
    end: '',
    link: '',
    comments: '',
    creation: '',
    applesData: [],
    revision: false,
    revisionComplete: false,
  });

  congregationKey = environment.congregationKey;
  path = signal<string>('');
  formCard = signal<FormGroup>(this.createFormCard());
  driverError = signal<boolean>(false);
  startError = signal<boolean>(false);
  endError = signal<boolean>(false);
  cardSubscription = signal<Subscription>(Subscription.EMPTY);
  countTrueApples = signal<number>(0);
  countFalseApples = signal<number>(0);
  dataLoaded = signal<boolean>(false);
  availableDrivers = signal<User[]>([]);
  isAdmin: boolean = false;
  isDriver: boolean = false;
  loggedDriverName: string = '';

  readonly modalComponent = viewChild(ModalComponent);

  isRevisionMode = computed(() => this.card().revision === true);
  hasValidDriver = computed(() => this.formCard().get('driver')?.valid ?? false);
  hasValidStart = computed(() => this.formCard().get('start')?.valid ?? false);
  totalApples = computed(() => this.card().applesData?.length ?? 0);
  checkedApples = computed(
    () => this.card().applesData?.filter((apple: CardApplesData) => apple.checked)?.length ?? 0,
  );

  constructor() {
    this.spinner.cargarSpinner();
    this.isAdmin = !!localStorage.getItem('tokenAdmin');
    this.isDriver = !!localStorage.getItem('tokenConductor') && !this.isAdmin;
    this.loggedDriverName = localStorage.getItem('nombreConductor') || '';

    // VALIDAR SI ESTOY REVISANDO O NO LA CARD
    if (this.cardService.dataCard.revision === true) {
      // CARGO LOS DATOS DESDE EL SERVICIO PARA REVISAR LA CARD
      this.card.set(this.cardService.dataCard);

      const form = this.formCard();
      form.patchValue({ driver: this.card().driver });
      form.patchValue({ start: this.card().start });
      form.patchValue({ end: this.card().end });
      form.patchValue({ comments: this.card().comments });

      this.card().applesData?.map((apple: CardApplesData) => {
        const applesData: FormArray = form.get('applesData') as FormArray;
        applesData.push(new FormControl({ name: apple.name, checked: apple.checked }));
      });
      this.dataLoaded.set(true);
      this.spinner.cerrarSpinner();
    } else {
      // SI NO ESTOY REVISANDO LA CARD, ENTONCES MUESTRO LA ULTIMA TARJETA.
      this.path.set(this.activatedRoute.snapshot.params['collection']);
      const subscription = this.territorieDataService
        .getCardTerritorie(this.path())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (cards) => {
            // Buscar la primera card completa (con applesData).
            // Si no hay ninguna completa, usar la primera y normalizar.
            const validCard = cards?.find((c: Card) => Array.isArray(c.applesData)) ?? cards?.[0];

            if (!validCard) {
              console.warn('[CardTerritory] No se encontraron cards para este territorio.');
              this.dataLoaded.set(true);
              this.spinner.cerrarSpinner();
              return;
            }

            // Normalizar campos faltantes
            if (!validCard.applesData) {
              validCard.applesData = [];
            }

            this.card.set(validCard);
            this.countTrueApples.set(0);

            // Limpia el FormArray antes de llenarlo
            const form = this.formCard();
            form.patchValue({ comments: this.card().comments });
            const applesData: FormArray = form.get('applesData') as FormArray;
            applesData.clear();

            this.card().applesData?.map((apple: CardApplesData) => {
              applesData.push(new FormControl({ name: apple.name, checked: apple.checked }));
              if (apple.checked === true) {
                this.countTrueApples.update((count) => count + 1);
              }
            });

            if (this.countTrueApples() !== 0) {
              form.patchValue({ start: this.card().start });
            }

            this.countTrueApples.set(0);
            this.applyDriverDefaultIfNeeded();
            this.dataLoaded.set(true);
            this.spinner.cerrarSpinner();
          },
          error: (err) => {
            console.error('Error fetching card:', err);
            this.spinner.cerrarSpinner();
            this.dataLoaded.set(true);
          },
        });
      this.cardSubscription.set(subscription);

      // Si estamos offline y firebase se queda colgado buscando en la red sin caché,
      // forzamos el cierre del spinner después de un breve delay para que se vea el mapa.
      if (!this.networkService.isOnline()) {
        setTimeout(() => {
          if (!this.dataLoaded()) {
            this.spinner.cerrarSpinner();
            this.dataLoaded.set(true);
          }
        }, 1500);
      }
    }
  }

  private createFormCard(): FormGroup {
    const cardData = this.card();
    return this.fb.group({
      driver: [cardData.driver, Validators.required],
      applesData: this.fb.array([]),
      start: [cardData.start, Validators.required],
      end: [cardData.end],
      comments: [cardData.comments],
    });
  }

  ngOnInit(): void {
    this.loadDriversOptions();
  }

  onCheckboxChange(e: { target: { value: string | undefined; checked: boolean } }): void {
    const target = e.target;
    const form = this.formCard();
    const applesData: FormArray = form.get('applesData') as FormArray;
    applesData.controls.forEach((item) => {
      if (item.value.name === target.value) {
        item.patchValue({ ...item.value, checked: target.checked });
      }
    });
  }

  // Gets creados para poder validar los datos ingresados
  get driver() {
    return this.formCard().get('driver');
  }

  get start() {
    return this.formCard().get('start');
  }

  openModal(): void {
    const modal = this.modalComponent();
    if (modal) {
      modal.openModal();
    }
  }

  verifyUniqueCheck(arr: CardApplesData[]): CardApplesData[] {
    const checkbox = new Set();
    const result = [];

    for (const objet of arr) {
      if (!checkbox.has(objet.name)) {
        checkbox.add(objet.name);
        result.push(objet);
      }
    }

    return result;
  }

  fillCard(): void {
    const form = this.formCard();
    const uniqueCheck = this.verifyUniqueCheck(form.value.applesData);

    // Rellenar card con los datos ingresados
    const currentCard = this.card();
    const updatedCard = {
      ...currentCard,
      driver: form.value.driver,
      start: form.value.start,
      end: form.value.end,
      comments: form.value.comments,
      applesData: uniqueCheck,
    };

    this.card.set(updatedCard);
  }

  async submitForm() {
    const form = this.formCard();

    // Validar formulario
    if (form.controls?.['driver'].invalid) {
      this.driverError.set(form.controls?.['driver'].invalid);
      return;
    }
    if (form.controls?.['start'].invalid) {
      this.startError.set(form.controls?.['start'].invalid);
      return;
    }
    if (form.controls?.['end'].value === '') {
      this.countFalseApples.set(0);
      form.value.applesData?.map((apple: CardApplesData) => {
        if (apple.checked === false) {
          this.countFalseApples.update((count) => count + 1);
        }
      });
      if (this.countFalseApples() === 0) {
        this.endError.set(true);
        return;
      }
      this.countFalseApples.set(0);
    }

    this.driverError.set(false);
    this.startError.set(false);
    this.endError.set(false);
    this.spinner.cargarSpinner();
    this.fillCard();

    const currentCard = this.card();

    if (currentCard.revision === true) {
      await this.territorieDataService
        .postCardTerritorie(currentCard, currentCard.link ?? '')
        ?.then(() => {
          console.log('todo bien');
        });
      await this.territorieDataService.putCardTerritorie(currentCard);
      // Validar campaña desde cache
      const activeCampaign = this.campaignService.getCachedCampaign();
      if (activeCampaign) {
        this.campaignService.updateCampaignStats(activeCampaign.id, currentCard);
      }
    } else {
      const updatedCard = {
        ...currentCard,
        creation: Timestamp.now(),
        isInitial: false,
      };
      this.card.set(updatedCard);

      await this.territorieDataService.sendRevisionCardTerritorie(updatedCard);

      this.spinner.cerrarSpinner();
      this.openModal();
    }
  }

  isConductorMode(): boolean {
    return this.isDriver && !this.isAdmin;
  }

  private loadDriversOptions(): void {
    if (!this.isConductorMode()) return;

    this.territorieDataService
      .getUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((users) => {
        const available = (users || [])
          .filter((user) => user.rol !== 'admin')
          .sort((a, b) => a.user.localeCompare(b.user));

        this.availableDrivers.set(available);
        this.applyDriverDefaultIfNeeded();
      });
  }

  private applyDriverDefaultIfNeeded(): void {
    if (!this.isConductorMode()) return;

    const form = this.formCard();
    const currentDriver = String(form.get('driver')?.value || '').trim();
    if (currentDriver) return;

    const ownName = this.loggedDriverName.trim();
    if (!ownName) return;

    const ownUserExists = this.availableDrivers().some(
      (user) => user.user.toLowerCase() === ownName.toLowerCase(),
    );

    if (ownUserExists) {
      form.patchValue({ driver: ownName });
    }
  }

  ngOnDestroy(): void {
    this.cardService.rollbackCard();

    const currentCard = this.card();
    const updatedCard = { ...currentCard, revision: false };
    this.card.set(updatedCard);

    this.cardService.dataCard.revision = false;
    this.cardSubscription().unsubscribe();
  }
}
