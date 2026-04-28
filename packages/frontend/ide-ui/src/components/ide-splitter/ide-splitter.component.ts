import {
  Component,
  input,
  output,
  computed,
  viewChild,
  afterNextRender,
  ChangeDetectionStrategy,
} from "@angular/core";
import {
  SplitterContainerDirective,
  SplitterHandleDirective,
  SplitterPanelDirective,
} from "quartz-headless";
import type { SplitterOrientation } from "quartz-headless";

function readStoredPosition(key: string | null, fallback: number): number {
  if (!key) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) return parsed;
    }
  } catch {
    /* storage unavailable */
  }
  return fallback;
}

@Component({
  selector: "v-ide-splitter",
  imports: [
    SplitterContainerDirective,
    SplitterHandleDirective,
    SplitterPanelDirective,
  ],
  template: `
    <div
      class="ide-splitter"
      qzSplitterContainer
      [orientation]="orientation()"
      [defaultPosition]="initialPosition()"
      [minSize]="minSize()"
      [maxSize]="maxSize()"
      (positionChange)="onPositionChange($event)"
    >
      <div class="ide-splitter__panel" qzSplitterPanel>
        <ng-content select="[splitterStart]" />
      </div>

      <div class="ide-splitter__handle" qzSplitterHandle>
        <span class="ide-splitter__handle-bar" aria-hidden="true"></span>
      </div>

      <div class="ide-splitter__panel" [qzSplitterPanel]="false">
        <ng-content select="[splitterEnd]" />
      </div>
    </div>
  `,
  styleUrl: "./ide-splitter.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdeSplitterComponent {
  readonly orientation = input<SplitterOrientation>("horizontal");
  readonly defaultPosition = input<number>(50);
  readonly minSize = input<number>(0);
  readonly maxSize = input<number>(100);
  readonly storageKey = input<string | null>(null);

  readonly positionChange = output<number>();

  protected readonly initialPosition = computed(() =>
    readStoredPosition(this.storageKey(), this.defaultPosition()),
  );

  // quartz-headless bug workaround: SplitterContainerDirective calls setPosition(defaultPosition())
  // in its constructor, before Angular has bound the [defaultPosition] input signal.
  // After the first render Angular inputs are set, so we re-apply the stored position.
  private readonly splitterDir = viewChild(SplitterContainerDirective);
  constructor() {
    afterNextRender(() => {
      this.splitterDir()?.splitterService.setPosition(this.initialPosition());
    });
  }

  protected onPositionChange(pos: number): void {
    const key = this.storageKey();
    if (key) {
      try {
        localStorage.setItem(key, String(pos));
      } catch {
        /* storage unavailable */
      }
    }
    this.positionChange.emit(pos);
  }
}
