import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'v-landing-how-it-works',
  standalone: true,
  templateUrl: './how-it-works.component.html',
  styleUrl: './how-it-works.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowItWorksComponent {
  protected readonly steps = [
    'Paste a GitHub repo URL',
    'Files clone in your browser — no server, no upload',
    'Edit, commit, push when you\'re ready',
  ];
}
