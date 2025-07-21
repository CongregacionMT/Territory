import { Component, OnDestroy, OnInit, inject, signal, viewChild, computed } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { CardService } from '@core/services/card.service';
import { TerritoryDataService } from '@core/services/territory-data.service';
import { RouterBreadcrumMockService } from '@shared/mocks/router-breadcrum-mock.service';
import { Subscription } from 'rxjs';
import { SpinnerService } from '@core/services/spinner.service';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { FocusInvalidInputDirective } from '../../../../shared/directives/focus-invalid-input.directive';
import { ModalComponent as ModalComponent_1 } from '../../../../shared/components/modal/modal.component';

@Component({
    selector: 'app-card-territory',
    templateUrl: './card-territory.component.html',
    styleUrls: ['./card-territory.component.scss'],
    imports: [BreadcrumbComponent, ReactiveFormsModule, FocusInvalidInputDirective, RouterLink, ModalComponent_1]
})
export class CardTerritoryComponent implements OnInit, OnDestroy {
  private routerBreadcrumMockService = inject(RouterBreadcrumMockService);
  private fb = inject(FormBuilder);
  private domSanitizer = inject(DomSanitizer);
  private territorieDataService = inject(TerritoryDataService);
  private cardService = inject(CardService);
  private activatedRoute = inject(ActivatedRoute);
  private spinner = inject(SpinnerService);
  private router = inject(Router);

  // Signals para el estado del componente
  card = signal<any>({
    id: "",
    location: 'Wheelwright',
    numberTerritory: 1,
    driver: '',
    start: '',
    end: '',
    link: '',
    comments: '',
    creation: '',
    applesData: [],
    revision: false,
    revisionComplete: false
  });

  iframe = signal<any>(null);
  path = signal<string>("");
  routerBreadcrum = signal<any[]>([]);
  formCard = signal<FormGroup>(this.createFormCard());
  driverError = signal<boolean>(false);
  startError = signal<boolean>(false);
  endError = signal<boolean>(false);
  cardSubscription = signal<Subscription>(Subscription.EMPTY);
  countTrueApples = signal<number>(0);
  countFalseApples = signal<number>(0);
  dataLoaded = signal<boolean>(false);

  // ViewChild signal (ya estaba usando signal)
  readonly modalComponent = viewChild(ModalComponent);

  // Computed signals para valores derivados
  isRevisionMode = computed(() => this.card().revision === true);
  hasValidDriver = computed(() => this.formCard().get('driver')?.valid ?? false);
  hasValidStart = computed(() => this.formCard().get('start')?.valid ?? false);
  totalApples = computed(() => this.card().applesData?.length ?? 0);
  checkedApples = computed(() =>
    this.card().applesData?.filter((apple: any) => apple.checked)?.length ?? 0
  );

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    this.spinner.cargarSpinner();

    // VALIDAR SI ESTOY REVISANDO O NO LA CARD
    if(this.cardService.dataCard.revision === true){
      // CARGO LOS DATOS DESDE EL SERVICIO PARA REVISAR LA CARD
      this.card.set(this.cardService.dataCard);

      const form = this.formCard();
      form.patchValue({driver: this.card().driver});
      form.patchValue({start: this.card().start});
      form.patchValue({end: this.card().end});
      form.patchValue({comments: this.card().comments});

      this.card().applesData.map((apple: any) => {
        const applesData: FormArray = form.get('applesData') as FormArray;
        applesData.push(new FormControl({name: apple.name, checked: apple.checked}));
      });
      this.dataLoaded.set(true);
      this.spinner.cerrarSpinner();
    } else {
      // SI NO ESTOY REVISANDO LA CARD, ENTONCES MUESTRO LA ULTIMA TARJETA.
      this.path.set(this.activatedRoute.snapshot.params['collection']);
      const subscription = this.territorieDataService.getCardTerritorie(this.path()).subscribe({
        next: card => {
          this.card.set(card[0]);
          this.countTrueApples.set(0);

          // Limpia el FormArray antes de llenarlo
          const form = this.formCard();
          const applesData: FormArray = form.get('applesData') as FormArray;
          applesData.clear();

          this.card().applesData.map((apple: any) => {
            applesData.push(new FormControl({name: apple.name, checked: apple.checked}));
            if(apple.checked === true){
              this.countTrueApples.update(count => count + 1);
            }
          });

          if(this.countTrueApples() !== 0){
            form.patchValue({start: this.card().start});
          }

          this.countTrueApples.set(0);
          this.dataLoaded.set(true);
          this.spinner.cerrarSpinner();
        }
      });
      this.cardSubscription.set(subscription);
    }
  }

  private createFormCard(): FormGroup {
    const cardData = this.card();
    return this.fb.group({
      driver: [cardData.driver, Validators.required],
      applesData: this.fb.array([]),
      start: [cardData.start, Validators.required],
      end: [cardData.end],
      comments: [cardData.comments]
    });
  }

  private getMapConfig(): Record<string, string> {
    return {
      "TerritorioW-1": '<iframe src="https://www.google.com/maps/d/embed?mid=1GOPjTgnhJgIJWBGZhvgc2eLcCnDkPS8&ehbc=2E312F" width="640" height="480" ></iframe>',
      "TerritorioW-2": '<iframe src="https://www.google.com/maps/d/embed?mid=19aieXhqwTtRITjYep-bbz-eUHSiSevI&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-3": '<iframe src="https://www.google.com/maps/d/embed?mid=171gUWLdZm7IztqqimwF36j4Io86M6gY&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-4": '<iframe src="https://www.google.com/maps/d/embed?mid=1kz4uJcy5eHHDJ2TEpa2qtQtr8adePVA&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-5": '<iframe src="https://www.google.com/maps/d/embed?mid=1Empajc3TYA8cap0GQCfJjVQWgRe61FI&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-6": '<iframe src="https://www.google.com/maps/d/embed?mid=1Syw58HcGT8bHqbblHjVxrgwiVDf7Y94&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-7": '<iframe src="https://www.google.com/maps/d/embed?mid=1QeU9b0mYYzwl_JtHsXbbKyPLTLBh5rA&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-8": '<iframe src="https://www.google.com/maps/d/embed?mid=18FI1y5REupNlof33G0E_r4BjPoOYav4&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-9": '<iframe src="https://www.google.com/maps/d/embed?mid=19pecMpvGkGLA1K96X-lXgqMQpMqDXfo&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-10": '<iframe src="https://www.google.com/maps/d/embed?mid=1Pd7I2FEdWn1fYYrpfU54hQTw6Fq3I-Q&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-11": '<iframe src="https://www.google.com/maps/d/embed?mid=1ci-JKShrktVmKUob0Cd8C1gGIxfxZZY&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-12": '<iframe src="https://www.google.com/maps/d/embed?mid=1CJoVzTewC4FJoy-xenubfUnKF567Oc8&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-13": '<iframe src="https://www.google.com/maps/d/embed?mid=1HrURCAjWnd_Ja6GgY9BKalm0KsLQf24&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-14": '<iframe src="https://www.google.com/maps/d/embed?mid=1VJPf3qsKrlcvZ3dYI7TxDdc7MTg-7cg&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-15": '<iframe src="https://www.google.com/maps/d/embed?mid=14UEzpZQY3EEeIUp1uYBmsfPDzoBTPUg&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-16": '<iframe src="https://www.google.com/maps/d/embed?mid=1g9ON_q6_cUL-E79iV279EkGBaoTbzb0&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioW-17": '<iframe src="https://www.google.com/maps/d/embed?mid=1C7zcRXsMBUHUaMHEVcUcTM4tplXiQHc&ehbc=2E312F" width="640" height="480"></iframe>',
      "TerritorioR": '<iframe src="https://www.google.com/maps/d/embed?mid=10pgOS5R4I6tfnimIe5AXFyvh3JLDiWA&ehbc=2E312F" width="640" height="480"></iframe>'
    };
  }

  ngOnInit(): void {
    console.log("card", this.card());

    // Breadcrum
    const breadcrumData = this.routerBreadcrumMockService.getBreadcrum();
    this.routerBreadcrum.set(breadcrumData[9]);

    // Carga de mapas optimizada
    const collection = this.activatedRoute.snapshot.params['collection'];
    const mapConfig = this.getMapConfig();
    const mapHtml = mapConfig[collection];

    if (mapHtml) {
      this.iframe.set(this.domSanitizer.bypassSecurityTrustHtml(mapHtml));
    }
  }

  onCheckboxChange(e: any): void {
    const form = this.formCard();
    const applesData: FormArray = form.get('applesData') as FormArray;
    applesData.controls.forEach((item: any) => {
      if(item.value.name === e.target.value){
        item.value.checked = e.target.checked;
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

  verifyUniqueCheck(arr: any[]): any[] {
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
      applesData: uniqueCheck
    };

    this.card.set(updatedCard);
  }

  submitForm(): void {
    const form = this.formCard();

    // Validar formulario
    if(form.controls?.['driver'].invalid){
      this.driverError.set(form.controls?.['driver'].invalid);
      return;
    }
    if(form.controls?.['start'].invalid){
      this.startError.set(form.controls?.['start'].invalid);
      return;
    }
    if(form.controls?.['end'].value === ""){
      this.countFalseApples.set(0);
      form.value.applesData.map((apple: any) => {
        if(apple.checked === false){
          this.countFalseApples.update(count => count + 1);
        }
      });
      if(this.countFalseApples() === 0){
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

    // Comparar si estoy revisando o no
    console.log("estoy revisando la tarjeta", currentCard);
    console.log("link", currentCard.link);
    if(currentCard.revision === true){
      this.territorieDataService.postCardTerritorie(currentCard, currentCard.link)
      ?.then(() => {
        console.log("todo bien");
      });
      this.territorieDataService.putCardTerritorie(currentCard);
    } else {
      const updatedCard = {
        ...currentCard,
        creation: Timestamp.now()
      };
      this.card.set(updatedCard);

      this.territorieDataService.sendRevisionCardTerritorie(updatedCard)
      ?.then(() => {
        this.spinner.cerrarSpinner();
        this.openModal();
      });
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
