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
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardService } from '@core/services/card.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { Subscription } from 'rxjs';
import { SpinnerService } from '@core/services/spinner.service';
import { NetworkService } from '@core/services/network.service';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { FocusInvalidInputDirective } from '../../../../shared/directives/focus-invalid-input.directive';
import { CampaignService } from '@core/services/campaign.service';
import { AuthService } from '@core/services/auth.service';
import { environment } from '@environments/environment';

import { Card, CardApplesData } from '@core/models/Card';
import { User } from '@core/models/User';

import { TerritoryMapComponent } from '../../components/territory-map/territory-map.component';

@Component({
  selector: 'app-card-territory',
  templateUrl: './card-territory.component.html',
  styleUrls: ['./card-territory.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    FocusInvalidInputDirective,
    ModalComponent,
    NgClass,
    TitleCasePipe,
    TerritoryMapComponent,
    RouterLink,
  ],
})
export class CardTerritoryComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private activatedRoute = inject(ActivatedRoute);
  public cardService = inject(CardService);
  private territorieDataService = inject(TerritoryDataService);
  private spinner = inject(SpinnerService);
  public networkService = inject(NetworkService);
  private campaignService = inject(CampaignService);
  public authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  modalComponent = viewChild.required(ModalComponent);

  path = signal<string>('');
  card = signal<Card>({
    applesData: [],
    comments: '',
    creation: Timestamp.now(),
    driver: '',
    end: '',
    id: '',
    link: '',
    name: '',
    revision: false,
    start: '',
  });

  congregationKey: string = environment.congregationKey;
  dataLoaded = signal<boolean>(false);
  availableDrivers = signal<User[]>([]);

  isAdmin = this.authService.isAdmin;
  isDriver = this.authService.isDriver;
  loggedDriverName = this.authService.driverName;

  countTrueApples = signal<number>(0);
  countFalseApples = signal<number>(0);
  driverError = signal<boolean>(false);
  startError = signal<boolean>(false);
  endError = signal<boolean>(false);

  private cardSubscription = signal<Subscription>(new Subscription());

  formCard = signal<FormGroup>(this.createFormCard());

  hasValidDriver = computed(() => this.formCard().get('driver')?.valid ?? false);
  hasValidStart = computed(() => this.formCard().get('start')?.valid ?? false);
  totalApples = computed(() => this.card().applesData?.length ?? 0);
  checkedApples = computed(
    () => this.card().applesData?.filter((apple: CardApplesData) => apple.checked)?.length ?? 0,
  );
  isRevisionMode = computed(() => this.card().revision === true);

  constructor() {}

  ngOnInit(): void {
    this.spinner.cargarSpinner();

    if (this.cardService.dataCard.revision === true) {
      this.card.set(this.cardService.dataCard);

      const form = this.formCard();
      form.patchValue({ driver: this.card().driver });
      form.patchValue({ start: this.card().start });
      form.patchValue({ end: this.card().end });
      form.patchValue({ comments: this.card().comments });

      this.card().applesData?.forEach((apple: CardApplesData) => {
        const applesData: FormArray = form.get('applesData') as FormArray;
        applesData.push(new FormControl({ name: apple.name, checked: apple.checked }));
      });
      this.dataLoaded.set(true);
      this.spinner.cerrarSpinner();
    } else {
      const collectionParam = String(this.activatedRoute.snapshot.params['collection'] || '');
      this.path.set(collectionParam);
      const subscription = this.territorieDataService
        .getCardTerritorie(this.path())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (cards) => {
            const validCard = cards?.find((c: Card) => Array.isArray(c.applesData)) ?? cards?.[0];

            if (!validCard) {
              console.warn('[CardTerritory] No se encontraron cards para este territorio.');
              this.dataLoaded.set(true);
              this.spinner.cerrarSpinner();
              return;
            }

            if (!validCard.applesData) {
              validCard.applesData = [];
            }

            this.card.set(validCard);
            this.countTrueApples.set(0);

            const form = this.formCard();
            form.patchValue({ comments: this.card().comments });
            const applesData: FormArray = form.get('applesData') as FormArray;
            applesData.clear();

            this.card().applesData?.forEach((apple: CardApplesData) => {
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

      if (!this.networkService.isOnline()) {
        setTimeout(() => {
          if (!this.dataLoaded()) {
            this.spinner.cerrarSpinner();
            this.dataLoaded.set(true);
          }
        }, 1500);
      }
    }

    this.loadDriversOptions();
  }

  private createFormCard(): FormGroup {
    const cardData = this.card();
    return this.fb.group({
      driver: [
        cardData.driver,
        [(control: AbstractControl): ValidationErrors | null => Validators.required(control)],
      ],
      applesData: this.fb.array([]),
      start: [
        cardData.start,
        [(control: AbstractControl): ValidationErrors | null => Validators.required(control)],
      ],
      end: [cardData.end],
      comments: [cardData.comments],
    });
  }

  onCheckboxChange(e: { target: { value: string | undefined; checked: boolean } }): void {
    const target = e.target;
    const form = this.formCard();
    const applesData: FormArray = form.get('applesData') as FormArray;
    applesData.controls.forEach((item) => {
      const itemVal = item.value as CardApplesData;
      if (itemVal.name === target.value) {
        item.patchValue({ ...itemVal, checked: target.checked });
      }
    });
  }

  onAppleToggle(apple: CardApplesData, event: Event): void {
    const input = event.target as HTMLInputElement;
    apple.checked = input.checked;
    this.onCheckboxChange({ target: { value: apple.name, checked: input.checked } });
  }

  get driver(): AbstractControl | null {
    return this.formCard().get('driver');
  }

  get start(): AbstractControl | null {
    return this.formCard().get('start');
  }

  openModal(): void {
    const modal = this.modalComponent();
    if (modal) {
      modal.openModal();
    }
  }

  verifyUniqueCheck(arr: CardApplesData[]): CardApplesData[] {
    const checkbox = new Set<string>();
    const result: CardApplesData[] = [];

    for (const objet of arr) {
      if (objet.name && !checkbox.has(objet.name)) {
        checkbox.add(objet.name);
        result.push(objet);
      }
    }

    return result;
  }

  fillCard(): void {
    const form = this.formCard();
    const rawApples = (form.value as { applesData?: CardApplesData[] }).applesData || [];
    const uniqueCheck = this.verifyUniqueCheck(rawApples);

    const currentCard = this.card();
    const formVal = form.value as Partial<Card>;
    const updatedCard: Card = {
      ...currentCard,
      driver: formVal.driver ?? '',
      start: formVal.start ?? '',
      end: formVal.end ?? '',
      comments: formVal.comments ?? '',
      applesData: uniqueCheck,
    };

    this.card.set(updatedCard);
  }

  async submitForm(): Promise<void> {
    const form = this.formCard();

    if (form.controls?.['driver'].invalid) {
      this.driverError.set(true);
      return;
    }
    if (form.controls?.['start'].invalid) {
      this.startError.set(true);
      return;
    }
    if (form.controls?.['end'].value === '') {
      this.countFalseApples.set(0);
      const apples = (form.value as { applesData?: CardApplesData[] }).applesData || [];
      apples.forEach((apple: CardApplesData) => {
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
      const rawCampaign: unknown = this.campaignService.getCachedCampaign();
      if (
        rawCampaign &&
        typeof rawCampaign === 'object' &&
        'id' in rawCampaign &&
        typeof (rawCampaign as { id: string }).id === 'string'
      ) {
        await this.campaignService.updateCampaignStats(
          (rawCampaign as { id: string }).id,
          currentCard,
        );
      }
    } else {
      const updatedCard = {
        ...currentCard,
        creation: Timestamp.now(),
      };
      this.card.set(updatedCard);

      await this.territorieDataService.sendRevisionCardTerritorie(updatedCard);

      this.spinner.cerrarSpinner();
      this.openModal();
    }
  }

  isConductorMode(): boolean {
    return this.isDriver() && !this.isAdmin();
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

    const ownName = this.loggedDriverName()?.trim() ?? '';
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
