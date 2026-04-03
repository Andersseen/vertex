import { NgModule, DoBootstrap, Injector, Provider } from "@angular/core";
import { createCustomElement } from "@angular/elements";
import { BrowserModule } from "@angular/platform-browser";
import { WebEditorComponent } from "./web-editor.component";

@NgModule({
  imports: [BrowserModule],
  declarations: [WebEditorComponent],
  providers: [],
})
export class WebEditorModule implements DoBootstrap {
  constructor(private injector: Injector) {}

  ngDoBootstrap(): void {
    // Create the custom element from the Angular component
    const webEditorElement = createCustomElement(WebEditorComponent, {
      injector: this.injector,
    });

    // Register the custom element with the browser
    if (!customElements.get("web-editor")) {
      customElements.define("web-editor", webEditorElement);
    }
  }
}
