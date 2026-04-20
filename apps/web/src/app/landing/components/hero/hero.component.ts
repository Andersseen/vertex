import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'v-landing-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroComponent {
  private readonly router = inject(Router);
  protected readonly url = signal('');

  cloneAndEdit(): void {
    const value = this.url().trim();
    if (!value) return;
    this.router.navigate(['/editor'], { queryParams: { clone: value } });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.cloneAndEdit();
  }
}
