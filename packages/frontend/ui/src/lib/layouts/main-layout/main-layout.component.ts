import { Component, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SplitterModule } from "primeng/splitter";
import { ToolbarModule } from "primeng/toolbar";

@Component({
  selector: "v-main-layout",
  standalone: true,
  imports: [CommonModule, SplitterModule, ToolbarModule],
  templateUrl: "./main-layout.component.html",
  styleUrls: ["./main-layout.component.scss"],
})
export class MainLayoutComponent {
  @Output() openFolder = new EventEmitter<void>();
}
