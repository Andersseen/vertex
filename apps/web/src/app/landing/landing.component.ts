import {
  Component,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
  afterNextRender,
} from '@angular/core';
import { NavbarComponent } from './components/navbar/navbar.component';
import { HeroComponent } from './components/hero/hero.component';
import { FeaturesComponent } from './components/features/features.component';
import { HowItWorksComponent } from './components/how-it-works/how-it-works.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'v-landing',
  imports: [
    NavbarComponent,
    HeroComponent,
    FeaturesComponent,
    HowItWorksComponent,
    FooterComponent,
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  constructor() {
    afterNextRender(() => {
      document.body.style.overflow = 'auto';
    });
    inject(DestroyRef).onDestroy(() => {
      document.body.style.overflow = 'hidden';
    });
  }
}
