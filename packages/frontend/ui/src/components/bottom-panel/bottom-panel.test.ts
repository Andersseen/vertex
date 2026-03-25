import { expect, test, describe } from "bun:test";
import { BottomPanelComponent } from "./bottom-panel.component";

describe("BottomPanelComponent", () => {
  test("should be defined", () => {
    expect(BottomPanelComponent).toBeDefined();
  });

  test("should have default tabs", () => {
    const component = new BottomPanelComponent();
    expect(component.tabs).toEqual(["Problems", "Output", "Debug Console", "Terminal"]);
  });

  test("should have activeTabIndex 3 by default", () => {
    const component = new BottomPanelComponent();
    expect(component.activeTabIndex).toBe(3);
  });
});
