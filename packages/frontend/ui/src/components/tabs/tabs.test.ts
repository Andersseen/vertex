import { expect, test, describe } from "bun:test";
import { TabsComponent } from "./tabs.component";

describe("TabsComponent", () => {
  test("should be defined", () => {
    expect(TabsComponent).toBeDefined();
  });

  test("should be created with default values", () => {
    const component = new TabsComponent();
    expect(component).toBeDefined();
    // Input signals are read-only, we can only test the component exists
    // In a real test with TestBed, we would test the component behavior through inputs/outputs
  });
});
