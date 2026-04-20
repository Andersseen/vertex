import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'v-landing-features',
  standalone: true,
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesComponent {
  protected readonly features = [
    {
      icon: 'git',
      title: 'Clone any repo',
      description:
        'Public or private GitHub repos. Files clone directly into your browser via isomorphic-git — no server involved.',
    },
    {
      icon: 'storage',
      title: 'Persistent storage',
      description:
        'OPFS keeps your files across sessions. Close the tab, come back later, everything is still there.',
    },
    {
      icon: 'ide',
      title: 'Full IDE experience',
      description:
        'Tabs, syntax highlighting for 15+ languages, file tree, integrated terminal. The tools you know.',
    },
  ];
}
