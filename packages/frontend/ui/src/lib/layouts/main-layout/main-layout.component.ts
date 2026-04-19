import { Component, output, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  IdeToolbarComponent,
  IdeButtonComponent,
  IdeSplitterComponent,
} from "@vertex/ide-ui";

@Component({
  selector: "v-main-layout",
  imports: [
    CommonModule,
    IdeToolbarComponent,
    IdeButtonComponent,
    IdeSplitterComponent,
  ],
  templateUrl: "./main-layout.component.html",
  styleUrls: ["./main-layout.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  readonly openFolder = output<void>();
  readonly cloneRepo = output<void>();
}
