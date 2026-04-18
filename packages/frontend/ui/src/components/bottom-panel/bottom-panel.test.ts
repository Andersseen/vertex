import { expect, test, describe } from "bun:test";
import { BottomPanelComponent } from "./bottom-panel.component";

describe("BottomPanelComponent", () => {
  test("should be defined", () => {
    expect(BottomPanelComponent).toBeDefined();
  });

  test("should have default tabs", () => {
    const component = new BottomPanelComponent();
    expect(component.tabs).toEqual([
      { id: "Problems", label: "Problems" },
      { id: "Output", label: "Output" },
      { id: "Debug Console", label: "Debug Console" },
      { id: "Terminal", label: "Terminal" },
    ]);
  });

  test("should have activeTab 'Terminal' by default", () => {
    const component = new BottomPanelComponent();
    expect(component.activeTab()).toBe("Terminal");
  });
});
