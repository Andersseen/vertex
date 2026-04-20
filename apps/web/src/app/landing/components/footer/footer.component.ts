import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'v-landing-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {}
