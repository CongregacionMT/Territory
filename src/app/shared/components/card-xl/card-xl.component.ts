import { Component, OnInit, input, ChangeDetectionStrategy } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-card-xl',
  templateUrl: './card-xl.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./card-xl.component.scss'],
})
export class CardXlComponent implements OnInit {
  readonly mapSRC = input<SafeHtml | string>();
  readonly mapName = input<string>();
  constructor() {}

  ngOnInit(): void {}
}
