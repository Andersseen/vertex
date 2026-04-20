import {
  Component,
  ChangeDetectionStrategy,
  signal,
  afterNextRender,
  ElementRef,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'v-landing-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly el = inject(ElementRef);
  protected readonly scrolled = signal(false);

  constructor() {
    afterNextRender(() => {
      const hero = document.querySelector('.hero');
      if (!hero) return;
      const observer = new IntersectionObserver(
        ([entry]) => this.scrolled.set(!entry.isIntersecting),
        { threshold: 0.1 },
      );
      observer.observe(hero);
    });
  }
}
