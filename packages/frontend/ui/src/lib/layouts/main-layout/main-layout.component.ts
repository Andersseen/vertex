import { Component, output, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SplitterModule } from "primeng/splitter";
import { IdeToolbarComponent, IdeButtonComponent } from "@vertex/ide-ui";

@Component({
  selector: "v-main-layout",
  standalone: true,
  imports: [CommonModule, SplitterModule, IdeToolbarComponent, IdeButtonComponent],
  templateUrl: "./main-layout.component.html",
  styleUrls: ["./main-layout.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  readonly openFolder = output<void>();
  readonly cloneRepo = output<void>();
}
